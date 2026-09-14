import Papa from "papaparse";
import { Readable } from "node:stream";
import { prisma } from "./prisma";
import { HttpError } from "./apiHandler";
import { validateInviteeRow, type ValidInviteeRow } from "./validation";
import type { ImportSummary } from "./types";

export const CHUNK_SIZE = 500;
export const MAX_REPORTED_ERRORS = 100;
/** Vercel serverless request bodies are capped at 4.5 MB; leave headroom for multipart framing. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const REQUIRED_COLUMNS = ["name", "phone", "email"] as const;

export interface PendingRow {
  /** Spreadsheet row number (header = row 1). */
  row: number;
  data: ValidInviteeRow;
}

export interface BatchResult {
  inserted: number;
  rejected: Array<{ row: number; reason: string }>;
}

export interface ParseHandlers {
  /**
   * Called with up to CHUNK_SIZE validated, file-deduped rows. Must persist them
   * and report how many were inserted plus per-row rejections. Parsing is paused
   * until the returned promise settles, so memory stays bounded.
   */
  onBatch(rows: PendingRow[]): Promise<BatchResult>;
}

/**
 * Streams a CSV through papaparse, validating + de-duplicating row by row and
 * handing off fixed-size batches. DB-agnostic so it can be tested without
 * Postgres. Accepts a Node stream (production) or a string (tests).
 */
export function parseInviteeCsv(
  source: NodeJS.ReadableStream | string,
  handlers: ParseHandlers,
): Promise<ImportSummary> {
  return new Promise<ImportSummary>((resolve, reject) => {
    const summary: ImportSummary = { imported: 0, skipped: 0, totalRows: 0, errors: [], errorsTruncated: false };
    const seenPhones = new Set<string>();
    let batch: PendingRow[] = [];
    let headerChecked = false;
    let settled = false;

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const addError = (row: number, reason: string) => {
      summary.skipped += 1;
      if (summary.errors.length < MAX_REPORTED_ERRORS) summary.errors.push({ row, reason });
      else summary.errorsTruncated = true;
    };

    const flush = async () => {
      if (batch.length === 0) return;
      const current = batch;
      batch = [];
      const { inserted, rejected } = await handlers.onBatch(current);
      summary.imported += inserted;
      for (const r of rejected) addError(r.row, r.reason);
    };

    Papa.parse<Record<string, string>>(source as never, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h: string) => h.trim().toLowerCase(),
      step: (results, parser) => {
        if (settled) return;

        if (!headerChecked) {
          headerChecked = true;
          const fields = results.meta.fields ?? [];
          const missing = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
          if (missing.length > 0) {
            parser.abort();
            fail(new HttpError(400, `CSV is missing required column(s): ${missing.join(", ")}`));
            return;
          }
        }

        summary.totalRows += 1;
        const rowNumber = summary.totalRows + 1;

        // Field-count mismatches are tolerated (validation below reports what is missing);
        // anything else (broken quotes, undetectable delimiter) is a real parse error.
        const parseError = results.errors.find((e) => e.type !== "FieldMismatch");
        if (parseError) {
          addError(rowNumber, `Parse error: ${parseError.message}`);
          return;
        }

        const validated = validateInviteeRow(results.data);
        if (!validated.ok) {
          addError(rowNumber, validated.reason);
          return;
        }

        if (seenPhones.has(validated.value.phone)) {
          addError(rowNumber, `Duplicate phone ${validated.value.phone} (earlier row in this file)`);
          return;
        }
        seenPhones.add(validated.value.phone);
        batch.push({ row: rowNumber, data: validated.value });

        if (batch.length >= CHUNK_SIZE) {
          parser.pause();
          flush()
            .then(() => parser.resume())
            .catch(fail);
        }
      },
      complete: () => {
        if (settled) return;
        flush()
          .then(() => {
            settled = true;
            resolve(summary);
          })
          .catch(fail);
      },
      error: (err: Error) => fail(err),
    });
  });
}

/**
 * Production entry point: stream an uploaded file into a campaign.
 *
 * Dedupe strategy:
 *   1. within the file  -> Set<phone> in parseInviteeCsv
 *   2. against the DB   -> one findMany per batch so we can name the offending rows
 *   3. safety net       -> createMany({ skipDuplicates }) relies on the unique
 *      (campaignId, phone) index, so a concurrent import can never violate it.
 */
export async function importInviteesFromCsv(campaignId: string, file: Blob): Promise<ImportSummary> {
  const stream = Readable.fromWeb(file.stream() as unknown as import("node:stream/web").ReadableStream);

  return parseInviteeCsv(stream, {
    async onBatch(rows) {
      const phones = rows.map((r) => r.data.phone);
      const existing = await prisma.invitee.findMany({
        where: { campaignId, phone: { in: phones } },
        select: { phone: true },
      });
      const existingPhones = new Set(existing.map((e) => e.phone));

      const rejected: BatchResult["rejected"] = [];
      const toInsert: Array<ValidInviteeRow & { campaignId: string }> = [];
      for (const r of rows) {
        if (existingPhones.has(r.data.phone)) {
          rejected.push({ row: r.row, reason: `Duplicate phone ${r.data.phone} (already in campaign)` });
        } else {
          toInsert.push({ campaignId, ...r.data });
        }
      }

      if (toInsert.length === 0) return { inserted: 0, rejected };

      const { count } = await prisma.invitee.createMany({ data: toInsert, skipDuplicates: true });
      // Rows lost to a race with a concurrent import: counted as skipped, not attributable to a row.
      for (let i = 0; i < toInsert.length - count; i++) {
        rejected.push({ row: 0, reason: "Duplicate phone (concurrent import)" });
      }
      return { inserted: count, rejected };
    },
  });
}

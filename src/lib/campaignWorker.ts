import { prisma } from "./prisma";
import { callingService, type CallContext } from "./callingService";
import { MAX_ATTEMPTS, staleCutoff } from "./campaignStats";
import type { BatchOutcomeKey } from "./types";

/** Small on purpose: 25 parallel simulated calls of <=1.5s finish well inside any serverless timeout. */
export const BATCH_SIZE = 25;

/** Hard ceiling on a single provider call so a hung provider can never wedge the worker. */
const CALL_TIMEOUT_MS = 10_000;

export interface ClaimedInvitee {
  id: string;
  name: string;
  phone: string;
  attempts: number;
  notes: string | null;
}

/**
 * Atomically claim up to BATCH_SIZE actionable invitees by flipping them to
 * `calling` in a single UPDATE ... RETURNING statement.
 *
 * Why raw SQL instead of findMany + updateMany:
 *   updateMany returns only a count, so with two concurrent workers you cannot
 *   tell *which* rows you won. `FOR UPDATE SKIP LOCKED` lets concurrent
 *   invocations each grab a disjoint set without blocking, and RETURNING gives
 *   the exact rows this invocation owns. Re-invoking (client retry, double
 *   click, two tabs) therefore never double-dials anyone.
 *
 * The predicate must match campaignStats.actionableWhere.
 */
export async function claimBatch(campaignId: string): Promise<ClaimedInvitee[]> {
  const cutoff = staleCutoff();
  return prisma.$queryRaw<ClaimedInvitee[]>`
    UPDATE "Invitee"
    SET "status" = 'calling', "lastCalledAt" = NOW()
    WHERE "id" IN (
      SELECT "id" FROM "Invitee"
      WHERE "campaignId" = ${campaignId}
        AND (
          "status" = 'pending'
          OR ("status" = 'failed' AND "attempts" < ${MAX_ATTEMPTS})
          OR ("status" = 'calling' AND ("lastCalledAt" IS NULL OR "lastCalledAt" < ${cutoff}))
        )
      ORDER BY "createdAt" ASC, "id" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "name", "phone", "attempts", "notes"
  `;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`call exceeded ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function appendNote(existing: string | null, line: string): string {
  return existing ? `${existing}\n${line}` : line;
}

/**
 * Dial one claimed invitee and persist the result. Never throws: every failure
 * path (provider error, DB error) is caught so one bad invitee cannot take down
 * the rest of the batch.
 */
export async function processInvitee(invitee: ClaimedInvitee, context: CallContext): Promise<BatchOutcomeKey> {
  const attempts = invitee.attempts + 1;
  const calledAt = new Date();

  try {
    const result = await withTimeout(
      callingService.simulateCall({ id: invitee.id, name: invitee.name, phone: invitee.phone }, context),
      CALL_TIMEOUT_MS,
    );

    if (result.outcome === "no_answer") {
      const exhausted = attempts >= MAX_ATTEMPTS;
      await prisma.invitee.update({
        where: { id: invitee.id },
        data: {
          status: exhausted ? "failed" : "pending",
          attempts,
          lastCalledAt: calledAt,
          lastError: exhausted ? `No answer after ${MAX_ATTEMPTS} attempts` : null,
          notes: appendNote(invitee.notes, `Attempt ${attempts}: no answer.`),
        },
      });
      return exhausted ? "failed" : "no_answer";
    }

    await prisma.invitee.update({
      where: { id: invitee.id },
      data: {
        status: result.outcome,
        attempts,
        lastCalledAt: calledAt,
        lastError: null,
        notes: appendNote(invitee.notes, `Attempt ${attempts} (${result.outcome}): ${result.notes ?? ""}`.trim()),
      },
    });
    return result.outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown call error";
    try {
      await prisma.invitee.update({
        where: { id: invitee.id },
        data: {
          status: "failed",
          attempts,
          lastCalledAt: calledAt,
          lastError: message,
          notes: appendNote(invitee.notes, `Attempt ${attempts}: failed (${message}).`),
        },
      });
    } catch (dbErr) {
      // Row stays `calling`; the stale-claim rule will pick it up again later.
      console.error(`[worker] could not record failure for invitee ${invitee.id}:`, dbErr);
    }
    return "failed";
  }
}

export function emptyOutcomes(): Record<BatchOutcomeKey, number> {
  return { confirmed: 0, declined: 0, undecided: 0, no_answer: 0, failed: 0 };
}

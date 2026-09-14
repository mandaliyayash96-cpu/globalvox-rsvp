"use client";

import { useRef, useState, type DragEvent } from "react";
import { api } from "@/lib/apiClient";
import type { CampaignStats, ImportSummary } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { formatBytes, formatNumber } from "@/lib/format";

type ImportResponse = ImportSummary & { stats: CampaignStats };

interface Props {
  campaignId: string;
  disabled?: boolean;
  onImported: (summary: ImportResponse) => void;
}

export function CsvUpload({ campaignId, disabled = false, onImported }: Props) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportResponse | null>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
      toast.error("Please choose a .csv file");
      return;
    }
    setFile(f);
    setSummary(null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    pick(e.dataTransfer.files?.[0]);
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await api.post<ImportResponse>(`/api/campaigns/${campaignId}/import`, body);
      setSummary(res);
      onImported(res);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast.error("Import failed", err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Import invitees"
        description="CSV with columns: name, phone, email (id optional). Duplicate phones are skipped."
        action={
          <a href="/sample-invitees.csv" download className="text-sm font-medium text-indigo-600 hover:underline">
            Download sample
          </a>
        }
      />
      <CardBody className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
            disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              : dragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-300 hover:border-indigo-300 hover:bg-slate-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={disabled}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {file ? (
            <>
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
              <p className="mt-1 text-xs text-slate-500">{formatBytes(file.size)} &middot; click to change</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">
                {disabled ? "Imports are locked while the campaign is running" : "Drag & drop a CSV here, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Up to 4 MB per file (~40k rows). Larger lists: split and upload in parts.</p>
            </>
          )}
        </div>

        <Button onClick={upload} disabled={!file || disabled} loading={uploading} className="w-full">
          {uploading ? "Importing..." : "Upload & validate"}
        </Button>

        {summary && <ImportSummaryView summary={summary} />}
      </CardBody>
    </Card>
  );
}

function ImportSummaryView({ summary }: { summary: ImportSummary }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="flex flex-wrap gap-4">
        <Stat label="Rows read" value={summary.totalRows} />
        <Stat label="Imported" value={summary.imported} className="text-emerald-700" />
        <Stat label="Skipped" value={summary.skipped} className={summary.skipped ? "text-amber-700" : ""} />
      </div>
      {summary.errors.length > 0 && (
        <div className="mt-3 max-h-48 overflow-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-1.5 font-medium">Row</th>
                <th className="px-2 py-1.5 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.errors.map((e, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5 tabular-nums text-slate-500">{e.row || "-"}</td>
                  <td className="px-2 py-1.5 text-slate-700">{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary.errorsTruncated && (
            <p className="border-t border-slate-100 px-2 py-1.5 text-xs text-slate-500">
              Showing the first {summary.errors.length} problems; {summary.skipped - summary.errors.length} more were skipped.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${className}`}>{formatNumber(value)}</p>
    </div>
  );
}

import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <p>
        Showing <span className="font-medium text-slate-900">{formatNumber(from)}</span>
        {" - "}
        <span className="font-medium text-slate-900">{formatNumber(to)}</span> of{" "}
        <span className="font-medium text-slate-900">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <span className="tabular-nums">
          Page {page} / {totalPages}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}

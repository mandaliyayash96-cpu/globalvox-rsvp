import type { CampaignStats } from "@/lib/types";
import { formatNumber } from "@/lib/format";

const CARDS: Array<{ key: keyof CampaignStats; label: string; className: string; sub?: (s: CampaignStats) => string | null }> = [
  { key: "total", label: "Total", className: "border-slate-200 bg-white text-slate-900" },
  { key: "confirmed", label: "Confirmed", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { key: "declined", label: "Declined", className: "border-rose-200 bg-rose-50 text-rose-800" },
  { key: "undecided", label: "Undecided", className: "border-amber-200 bg-amber-50 text-amber-800" },
  {
    key: "pending",
    label: "Pending",
    className: "border-sky-200 bg-sky-50 text-sky-800",
    sub: (s) => (s.calling > 0 ? `${s.calling} calling now` : null),
  },
  {
    key: "failed",
    label: "Failed",
    className: "border-slate-300 bg-slate-100 text-slate-800",
    sub: (s) => {
      const retryable = s.actionable - s.pending - (s.calling - s.inFlight);
      return retryable > 0 ? `${retryable} will retry` : null;
    },
  },
];

export function StatsCards({ stats }: { stats: CampaignStats }) {
  return (
    <section aria-label="Live statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map((c) => {
        const sub = c.sub?.(stats);
        return (
          <div key={c.key} className={`rounded-xl border px-4 py-3 shadow-sm ${c.className}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(stats[c.key])}</p>
            <p className="mt-0.5 h-4 text-xs opacity-70">{sub ?? ""}</p>
          </div>
        );
      })}
    </section>
  );
}

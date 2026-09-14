import type { CampaignStatus, InviteeStatus } from "@/lib/types";

const INVITEE_STYLES: Record<InviteeStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  calling: { label: "Calling", className: "bg-violet-50 text-violet-700 ring-violet-600/20 animate-pulse" },
  confirmed: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  declined: { label: "Declined", className: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  undecided: { label: "Undecided", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  failed: { label: "Failed", className: "bg-slate-100 text-slate-700 ring-slate-500/20" },
};

const CAMPAIGN_STYLES: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  running: { label: "Running", className: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
};

const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

export function InviteeStatusBadge({ status }: { status: InviteeStatus }) {
  const s = INVITEE_STYLES[status];
  return <span className={`${base} ${s.className}`}>{s.label}</span>;
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const s = CAMPAIGN_STYLES[status];
  return (
    <span className={`${base} ${s.className}`}>
      {status === "running" && <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />}
      {s.label}
    </span>
  );
}

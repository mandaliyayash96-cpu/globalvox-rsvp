import Link from "next/link";
import type { CampaignDTO, CampaignStatus } from "@/lib/types";
import { CampaignStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";

export function CampaignHeader({ campaign, status }: { campaign: CampaignDTO; status: CampaignStatus }) {
  return (
    <Card className="px-5 py-5">
      <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">
        &larr; All campaigns
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{campaign.name}</h1>
        <CampaignStatusBadge status={status} />
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Event</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{campaign.eventName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">When</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(campaign.eventDate)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Where</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{campaign.eventLocation}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Call objective</p>
        <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{campaign.objective}</p>
      </div>
    </Card>
  );
}

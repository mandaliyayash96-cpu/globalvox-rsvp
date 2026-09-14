import Link from "next/link";
import type { CampaignListItem } from "@/lib/types";
import { CampaignStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatNumber } from "@/lib/format";

export function CampaignList({ items }: { items: CampaignListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No campaigns yet"
        description="Create your first campaign using the form. You can then import invitees and start calling."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/campaigns/${c.id}`} className="block">
            <Card className="px-5 py-4 transition hover:border-indigo-300 hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-slate-900">{c.name}</h2>
                    <CampaignStatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {c.eventName} &middot; {formatDate(c.eventDate)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">{c.eventLocation}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{formatNumber(c.inviteeCount)}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">invitees</p>
                </div>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

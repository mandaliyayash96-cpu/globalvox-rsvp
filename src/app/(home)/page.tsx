import { prisma } from "@/lib/prisma";
import { toCampaignDTO } from "@/lib/serializers";
import type { CampaignListItem } from "@/lib/types";
import { CampaignList } from "@/components/CampaignList";
import { NewCampaignForm } from "@/components/NewCampaignForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { invitees: true } } },
  });
  const items: CampaignListItem[] = campaigns.map((c) => ({ ...toCampaignDTO(c), inviteeCount: c._count.invitees }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a campaign, import your invitee list, and let the AI caller collect RSVPs.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CampaignList items={items} />
        </div>
        <div>
          <NewCampaignForm />
        </div>
      </div>
    </div>
  );
}

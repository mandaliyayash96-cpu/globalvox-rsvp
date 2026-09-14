import type { Metadata } from "next";
import { getCampaignStats } from "@/lib/campaignStats";
import { getCampaignOr404 } from "@/lib/queries";
import { toCampaignDTO } from "@/lib/serializers";
import { CommandCenter } from "@/components/campaign/CommandCenter";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campaign = await getCampaignOr404(params.id);
  return { title: `${campaign.name} - RSVP Campaign Manager` };
}

export default async function CampaignPage({ params }: Props) {
  const campaign = await getCampaignOr404(params.id);
  const stats = await getCampaignStats(campaign.id);
  return <CommandCenter campaign={toCampaignDTO(campaign)} initialStats={stats} />;
}

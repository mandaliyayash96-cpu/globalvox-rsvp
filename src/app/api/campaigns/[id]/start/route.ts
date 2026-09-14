import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, withApiHandler } from "@/lib/apiHandler";
import { countActionable, getCampaignStats } from "@/lib/campaignStats";
import { toCampaignDTO } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/campaigns/:id/start - flip to `running`.
 * Also used to *resume* a completed campaign after more invitees were imported.
 * Idempotent: starting an already-running campaign is a no-op 200.
 */
export const POST = withApiHandler(async (_req, { params }) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) throw new HttpError(404, "Campaign not found");

  if (campaign.status === "running") {
    const stats = await getCampaignStats(campaign.id);
    return NextResponse.json({ campaign: toCampaignDTO(campaign), stats, alreadyRunning: true });
  }

  const [total, actionable] = await Promise.all([
    prisma.invitee.count({ where: { campaignId: campaign.id } }),
    countActionable(campaign.id),
  ]);
  if (total === 0) throw new HttpError(400, "Import at least one invitee before starting the campaign.");
  if (actionable === 0) throw new HttpError(400, "Every invitee has already been contacted. Import more to run again.");

  const updated = await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "running" } });
  const stats = await getCampaignStats(campaign.id);
  return NextResponse.json({ campaign: toCampaignDTO(updated), stats, alreadyRunning: false });
});

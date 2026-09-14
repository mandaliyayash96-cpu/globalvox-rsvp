import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, withApiHandler } from "@/lib/apiHandler";
import { getCampaignStats } from "@/lib/campaignStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/campaigns/:id/stats - counts by status + progress numbers. */
export const GET = withApiHandler(async (_req, { params }) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!campaign) throw new HttpError(404, "Campaign not found");
  const stats = await getCampaignStats(campaign.id);
  return NextResponse.json({ stats, campaignStatus: campaign.status });
});

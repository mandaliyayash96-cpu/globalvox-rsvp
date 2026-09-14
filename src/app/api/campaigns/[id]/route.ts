import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, withApiHandler } from "@/lib/apiHandler";
import { getCampaignStats } from "@/lib/campaignStats";
import { toCampaignDTO } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/campaigns/:id - campaign + live stats. */
export const GET = withApiHandler(async (_req, { params }) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) throw new HttpError(404, "Campaign not found");
  const stats = await getCampaignStats(campaign.id);
  return NextResponse.json({ campaign: toCampaignDTO(campaign), stats });
});

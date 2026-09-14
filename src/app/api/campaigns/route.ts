import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, readJsonBody, withApiHandler } from "@/lib/apiHandler";
import { validateCampaignInput } from "@/lib/validation";
import { toCampaignDTO } from "@/lib/serializers";
import type { CampaignListItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/campaigns - newest first, with invitee counts. */
export const GET = withApiHandler(async () => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { invitees: true } } },
  });
  const items: CampaignListItem[] = campaigns.map((c) => ({
    ...toCampaignDTO(c),
    inviteeCount: c._count.invitees,
  }));
  return NextResponse.json({ items });
});

/** POST /api/campaigns - create a draft campaign. */
export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await readJsonBody(req);
  const validated = validateCampaignInput(body);
  if (!validated.ok) {
    throw new HttpError(400, "Please fix the highlighted fields", validated.errors);
  }
  const campaign = await prisma.campaign.create({ data: validated.value });
  return NextResponse.json(toCampaignDTO(campaign), { status: 201 });
});

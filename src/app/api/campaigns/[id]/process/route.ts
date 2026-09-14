import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, withApiHandler } from "@/lib/apiHandler";
import { getCampaignStats } from "@/lib/campaignStats";
import { claimBatch, emptyOutcomes, processInvitee } from "@/lib/campaignWorker";
import type { CampaignStatus, ProcessResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// A batch of 25 x <=1.5s parallel calls finishes in ~2-3s; 60s is a generous ceiling
// that is valid on every Vercel plan.
export const maxDuration = 60;

/**
 * POST /api/campaigns/:id/process - the batch worker.
 *
 * Each invocation: claim <= BATCH_SIZE rows atomically -> dial them in parallel
 * -> persist each result -> recompute stats -> auto-complete the campaign when
 * nothing is left. Safe to call repeatedly / concurrently (see claimBatch).
 */
export const POST = withApiHandler(async (_req, { params }) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, eventName: true, eventDate: true },
  });
  if (!campaign) throw new HttpError(404, "Campaign not found");
  if (campaign.status !== "running") {
    throw new HttpError(409, `Campaign is ${campaign.status}; start it before processing.`);
  }

  const claimed = await claimBatch(campaign.id);

  const outcomes = emptyOutcomes();
  if (claimed.length > 0) {
    const context = { eventName: campaign.eventName, eventDate: campaign.eventDate };
    // processInvitee never rejects, so Promise.all cannot fail part-way through.
    const results = await Promise.all(claimed.map((invitee) => processInvitee(invitee, context)));
    for (const r of results) outcomes[r] += 1;
  }

  const stats = await getCampaignStats(campaign.id);

  let campaignStatus: CampaignStatus = campaign.status;
  if (stats.actionable === 0 && stats.inFlight === 0) {
    // Guarded update: only flip running -> completed; harmless if another worker already did.
    await prisma.campaign.updateMany({ where: { id: campaign.id, status: "running" }, data: { status: "completed" } });
    campaignStatus = "completed";
  }

  const body: ProcessResult = {
    processed: claimed.length,
    remaining: stats.actionable,
    inFlight: stats.inFlight,
    outcomes,
    campaignStatus,
    stats,
  };
  return NextResponse.json(body);
});

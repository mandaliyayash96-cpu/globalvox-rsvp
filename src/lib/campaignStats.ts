import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { CampaignStats } from "./types";

/** A retryable failure (provider timeout) is re-dialed until this many attempts. */
export const MAX_ATTEMPTS = 3;

/**
 * A row stuck in `calling` longer than this is assumed orphaned (the worker
 * invocation died mid-batch, e.g. a function timeout) and becomes claimable again.
 * A real batch finishes in a few seconds, so 2 minutes is very conservative.
 */
export const STALE_CALL_MS = 2 * 60 * 1000;

export function staleCutoff(now = Date.now()): Date {
  return new Date(now - STALE_CALL_MS);
}

/**
 * The single definition of "the worker still has something to do" for a campaign.
 * Mirrored in SQL inside campaignWorker.claimBatch — keep both in sync.
 */
export function actionableWhere(campaignId: string, now = Date.now()): Prisma.InviteeWhereInput {
  return {
    campaignId,
    OR: [
      { status: "pending" },
      { status: "failed", attempts: { lt: MAX_ATTEMPTS } },
      {
        status: "calling",
        OR: [{ lastCalledAt: null }, { lastCalledAt: { lt: staleCutoff(now) } }],
      },
    ],
  };
}

export function inFlightWhere(campaignId: string, now = Date.now()): Prisma.InviteeWhereInput {
  return { campaignId, status: "calling", lastCalledAt: { gte: staleCutoff(now) } };
}

export async function countActionable(campaignId: string): Promise<number> {
  return prisma.invitee.count({ where: actionableWhere(campaignId) });
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const now = Date.now();
  const [groups, actionable, inFlight] = await Promise.all([
    prisma.invitee.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { _all: true },
    }),
    prisma.invitee.count({ where: actionableWhere(campaignId, now) }),
    prisma.invitee.count({ where: inFlightWhere(campaignId, now) }),
  ]);

  const byStatus = { pending: 0, calling: 0, confirmed: 0, declined: 0, undecided: 0, failed: 0 };
  for (const g of groups) byStatus[g.status] = g._count._all;

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const contacted = byStatus.confirmed + byStatus.declined + byStatus.undecided;

  return {
    total,
    ...byStatus,
    actionable,
    inFlight,
    processed: Math.max(0, total - actionable - inFlight),
    contacted,
  };
}

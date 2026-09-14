import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "./prisma";

/**
 * Request-scoped, de-duplicated lookups shared by layout + metadata + page.
 *
 * The existence check lives in the segment *layout* (outside the loading.tsx
 * Suspense boundary) so that notFound() produces a real HTTP 404. If it were
 * only in the page, the shell would already have streamed with a 200.
 */
export const getCampaignOr404 = cache(async (id: string) => {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();
  return campaign;
});

export const getInviteeOr404 = cache(async (campaignId: string, inviteeId: string) => {
  const invitee = await prisma.invitee.findFirst({
    where: { id: inviteeId, campaignId },
    include: { campaign: { select: { id: true, name: true, eventName: true, eventDate: true, status: true } } },
  });
  if (!invitee) notFound();
  return invitee;
});

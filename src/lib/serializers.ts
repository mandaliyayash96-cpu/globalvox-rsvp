import type { Campaign, Invitee } from "@prisma/client";
import type { CampaignDTO, InviteeListItem } from "./types";

export function toCampaignDTO(c: Campaign): CampaignDTO {
  return {
    id: c.id,
    name: c.name,
    eventName: c.eventName,
    eventDate: c.eventDate.toISOString(),
    eventLocation: c.eventLocation,
    objective: c.objective,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  };
}

export function toInviteeListItem(
  i: Pick<Invitee, "id" | "name" | "phone" | "email" | "status" | "attempts" | "lastCalledAt">,
): InviteeListItem {
  return {
    id: i.id,
    name: i.name,
    phone: i.phone,
    email: i.email,
    status: i.status,
    attempts: i.attempts,
    lastCalledAt: i.lastCalledAt ? i.lastCalledAt.toISOString() : null,
  };
}

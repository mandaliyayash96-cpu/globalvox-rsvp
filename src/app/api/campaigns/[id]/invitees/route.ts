import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError, withApiHandler } from "@/lib/apiHandler";
import { toInviteeListItem } from "@/lib/serializers";
import { INVITEE_PAGE_SIZE, INVITEE_STATUSES, type InviteeListResponse, type InviteeStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = INVITEE_PAGE_SIZE;
const MAX_SEARCH_LENGTH = 100;

function parsePage(raw: string | null): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * GET /api/campaigns/:id/invitees?page=1&search=&status=
 * Server-side pagination (50/page) + search on name/phone/email + status filter.
 */
export const GET = withApiHandler(async (req: NextRequest, { params }) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!campaign) throw new HttpError(404, "Campaign not found");

  const sp = req.nextUrl.searchParams;
  const page = parsePage(sp.get("page"));
  const search = (sp.get("search") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  const statusParam = sp.get("status") ?? "";
  const status = INVITEE_STATUSES.includes(statusParam as InviteeStatus) ? (statusParam as InviteeStatus) : undefined;

  const where: Prisma.InviteeWhereInput = {
    campaignId: campaign.id,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.invitee.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, phone: true, email: true, status: true, attempts: true, lastCalledAt: true },
    }),
    prisma.invitee.count({ where }),
  ]);

  const body: InviteeListResponse = {
    items: items.map(toInviteeListItem),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
  return NextResponse.json(body);
});

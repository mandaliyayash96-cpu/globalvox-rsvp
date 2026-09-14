import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, withApiHandler } from "@/lib/apiHandler";
import { MAX_UPLOAD_BYTES, importInviteesFromCsv } from "@/lib/csvImport";
import { getCampaignStats } from "@/lib/campaignStats";
import { formatBytes } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/campaigns/:id/import  (multipart/form-data, field "file")
 * Streams the CSV, validates each row, dedupes on phone, inserts in chunks of 500.
 */
export const POST = withApiHandler(async (req: NextRequest, { params }) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!campaign) throw new HttpError(404, "Campaign not found");
  if (campaign.status === "running") {
    throw new HttpError(409, "Cannot import while the campaign is running. Wait for it to finish.");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw new HttpError(400, "Expected multipart/form-data with a 'file' field");
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) throw new HttpError(400, "Missing 'file' field");
  if (file.size === 0) throw new HttpError(400, "The uploaded file is empty");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new HttpError(
      413,
      `File is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}. Split it into smaller files.`,
    );
  }

  const summary = await importInviteesFromCsv(campaign.id, file);
  const stats = await getCampaignStats(campaign.id);
  return NextResponse.json({ ...summary, stats });
});

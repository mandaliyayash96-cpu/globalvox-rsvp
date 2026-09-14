import type { Campaign, CampaignStatus, Invitee, InviteeStatus } from "@prisma/client";

export type { Campaign, CampaignStatus, Invitee, InviteeStatus };

export const INVITEE_STATUSES: InviteeStatus[] = [
  "pending",
  "calling",
  "confirmed",
  "declined",
  "undecided",
  "failed",
];

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["draft", "running", "completed"];

/** Server-side page size for the invitee table. */
export const INVITEE_PAGE_SIZE = 50;

/** Aggregated numbers shown on the dashboard; computed server-side in campaignStats.ts. */
export interface CampaignStats {
  total: number;
  pending: number;
  calling: number;
  confirmed: number;
  declined: number;
  undecided: number;
  failed: number;
  /** Rows the worker will still pick up (pending, retryable failed, stale calling). */
  actionable: number;
  /** Rows currently being dialed by some worker invocation. */
  inFlight: number;
  /** Rows in a terminal state: total - actionable - inFlight. Drives the progress bar. */
  processed: number;
  /** Rows where a human actually answered: confirmed + declined + undecided. */
  contacted: number;
}

export interface CampaignDTO {
  id: string;
  name: string;
  eventName: string;
  eventDate: string; // ISO
  eventLocation: string;
  objective: string;
  status: CampaignStatus;
  createdAt: string; // ISO
}

export interface CampaignListItem extends CampaignDTO {
  inviteeCount: number;
}

export interface InviteeListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: InviteeStatus;
  attempts: number;
  lastCalledAt: string | null;
}

export interface InviteeListResponse {
  items: InviteeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportRowError {
  /** Spreadsheet row number (header is row 1). */
  row: number;
  reason: string;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  /** Data rows seen (excluding header). */
  totalRows: number;
  errors: ImportRowError[];
  /** True when more errors occurred than we return (capped to keep the payload small). */
  errorsTruncated: boolean;
}

export type BatchOutcomeKey = "confirmed" | "declined" | "undecided" | "no_answer" | "failed";

export interface ProcessResult {
  processed: number;
  remaining: number;
  inFlight: number;
  outcomes: Record<BatchOutcomeKey, number>;
  campaignStatus: CampaignStatus;
  stats: CampaignStats;
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

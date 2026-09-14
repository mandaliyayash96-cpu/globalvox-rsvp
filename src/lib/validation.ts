/**
 * Small hand-rolled validators. Kept dependency-free on purpose (zod would be
 * fine too, but for three shapes it is not worth the bundle).
 */

// Permissive E.164-ish: optional "+", then 7-15 digits. Separators are stripped first.
export const PHONE_REGEX = /^\+?\d{7,15}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_NAME_LENGTH = 200;
export const MAX_EMAIL_LENGTH = 254;

export function normalizePhone(raw: string): string {
  // Remove spaces, dashes, dots and parentheses: "+91 98765-00011" -> "+919876500011".
  return raw.trim().replace(/[\s\-().]/g, "");
}

export interface ValidInviteeRow {
  name: string;
  phone: string;
  email: string;
}

export type RowValidation =
  | { ok: true; value: ValidInviteeRow }
  | { ok: false; reason: string };

export function validateInviteeRow(raw: Record<string, unknown>): RowValidation {
  const name = String(raw.name ?? "").trim();
  const phone = normalizePhone(String(raw.phone ?? ""));
  const email = String(raw.email ?? "").trim().toLowerCase();

  if (!name) return { ok: false, reason: "Name is required" };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, reason: `Name exceeds ${MAX_NAME_LENGTH} characters` };
  if (!phone) return { ok: false, reason: "Phone is required" };
  if (!PHONE_REGEX.test(phone)) return { ok: false, reason: `Invalid phone "${phone}" (expected + and 7-15 digits)` };
  if (!email) return { ok: false, reason: "Email is required" };
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
    return { ok: false, reason: `Invalid email "${email}"` };
  }

  return { ok: true, value: { name, phone, email } };
}

export interface CampaignInput {
  name: string;
  eventName: string;
  eventDate: Date;
  eventLocation: string;
  objective: string;
}

export type CampaignValidation =
  | { ok: true; value: CampaignInput }
  | { ok: false; errors: Record<string, string> };

export function validateCampaignInput(body: unknown): CampaignValidation {
  const errors: Record<string, string> = {};
  const src = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const str = (key: string, max = 200) => {
    const value = String(src[key] ?? "").trim();
    if (!value) errors[key] = "Required";
    else if (value.length > max) errors[key] = `Must be ${max} characters or fewer`;
    return value;
  };

  const name = str("name");
  const eventName = str("eventName");
  const eventLocation = str("eventLocation");
  const objective = str("objective", 2000);

  const rawDate = String(src.eventDate ?? "").trim();
  const eventDate = new Date(rawDate);
  if (!rawDate) errors.eventDate = "Required";
  else if (Number.isNaN(eventDate.getTime())) errors.eventDate = "Invalid date";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, eventName, eventDate, eventLocation, objective } };
}

const DOT = "•";
const DASH = "—";

/** "+919876500011" -> "+91 98*****011" (masked with bullets). Keeps country code + last 3 digits. */
export function maskPhone(phone: string): string {
  if (!phone) return "";
  if (phone.length <= 6) return phone;
  const head = phone.slice(0, 3);
  const visibleAfterHead = phone.slice(3, 5);
  const tail = phone.slice(-3);
  const hidden = Math.max(1, phone.length - head.length - visibleAfterHead.length - tail.length);
  return `${head} ${visibleAfterHead}${DOT.repeat(hidden)}${tail}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return DASH;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return DASH;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

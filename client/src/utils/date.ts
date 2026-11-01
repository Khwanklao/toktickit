/**
 * Date/time formatting and conversion helpers for Asia/Bangkok (UTC+7).
 * Standardized across TokTickIT client without external date libraries.
 */

const bangkokDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Format an ISO string or Date object into a readable Bangkok time string:
 * e.g. "Oct 19, 2026, 10:30 AM"
 */
export function formatBangkokDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  return bangkokDateTimeFormatter.format(d);
}

/**
 * Convert a Date or ISO UTC string into "YYYY-MM-DDTHH:mm" for <input type="datetime-local" />
 * in the Asia/Bangkok timezone.
 */
export function toDateTimeLocalBangkok(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

/**
 * Convert a "YYYY-MM-DDTHH:mm" string (interpreted in Asia/Bangkok, UTC+7)
 * back to an ISO UTC string (e.g. "2026-10-19T03:30:00.000Z").
 */
export function fromDateTimeLocalBangkok(localStr: string): string {
  if (!localStr) return "";
  // Bangkok is UTC+7 with no daylight saving time
  const d = new Date(`${localStr}:00+07:00`);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type { EventDoc } from "./types";

export const SLOT_MINUTES = 30;

/**
 * Build the canonical UTC slot list for an event based on the
 * organizer's chosen dates + time range, interpreted in their timezone.
 */
export function buildEventSlotsUTC(event: EventDoc): string[] {
  const slots: string[] = [];
  const tz = event.organizerTimezone;
  const startHour = event.timeRange.start;
  const endHour = event.timeRange.end;
  for (const dateStr of event.dates) {
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const local = `${dateStr}T${hh}:${mm}:00`;
        const utc = fromZonedTime(local, tz);
        slots.push(utc.toISOString());
      }
    }
  }
  return slots;
}

/**
 * Group UTC slots by the viewer-local date (YYYY-MM-DD).
 * Returns ordered columns of dates and a map of dateKey -> ordered slot UTC strings.
 */
export function groupSlotsByLocalDate(
  utcSlots: string[],
  viewerTz: string
): { dates: string[]; byDate: Record<string, string[]>; rowKeys: string[] } {
  const byDate: Record<string, string[]> = {};
  const rowSet = new Set<string>();
  for (const iso of utcSlots) {
    const d = new Date(iso);
    const dateKey = formatInTimeZone(d, viewerTz, "yyyy-MM-dd");
    const timeKey = formatInTimeZone(d, viewerTz, "HH:mm");
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(iso);
    rowSet.add(timeKey);
  }
  const dates = Object.keys(byDate).sort();
  for (const k of dates) {
    byDate[k].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }
  const rowKeys = Array.from(rowSet).sort();
  return { dates, byDate, rowKeys };
}

export function formatLocalTime(iso: string, tz: string, fmt = "HH:mm"): string {
  return formatInTimeZone(new Date(iso), tz, fmt);
}

export function formatLocalDate(iso: string, tz: string, fmt = "EEE MMM d"): string {
  return formatInTimeZone(new Date(iso), tz, fmt);
}

export function formatLocalFull(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "EEE MMM d, h:mm a");
}

export function tzAbbreviation(tz: string, ref: Date = new Date()): string {
  try {
    return formatInTimeZone(ref, tz, "zzz");
  } catch {
    return tz;
  }
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function listAllTimezones(): string[] {
  const I = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  if (typeof I.supportedValuesOf === "function") {
    return I.supportedValuesOf("timeZone");
  }
  return [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Hong_Kong",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Asia/Kolkata",
    "Australia/Sydney",
  ];
}

export function isBusinessHourLocal(iso: string, tz: string): boolean {
  const h = Number(formatInTimeZone(new Date(iso), tz, "H"));
  return h >= 9 && h < 19;
}

export function localTimeOfDay(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "HH:mm");
}

export function localDateKey(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd");
}

import { DateTime } from "luxon";

export const TEHRAN_ZONE = "Asia/Tehran";

/** Parse a `<input type="datetime-local">` value as Tehran local time and return a UTC JS Date. */
export function tehranLocalInputToUtc(value: string): Date {
  const dt = DateTime.fromISO(value, { zone: TEHRAN_ZONE });
  if (!dt.isValid) throw new Error("تاریخ/ساعت نامعتبر است");
  return dt.toUTC().toJSDate();
}

export function hoursFromNowUtc(hours: number): Date {
  return DateTime.utc().plus({ hours }).toJSDate();
}

/** Midnight (start of next day) in Tehran time, as a UTC JS Date. */
export function nextTehranMidnightUtc(from: Date = new Date()): Date {
  return DateTime.fromJSDate(from, { zone: TEHRAN_ZONE })
    .plus({ days: 1 })
    .startOf("day")
    .toUTC()
    .toJSDate();
}

export function formatTehran(date: Date): string {
  return DateTime.fromJSDate(date, { zone: TEHRAN_ZONE }).toFormat(
    "yyyy/LL/dd HH:mm"
  );
}

export function isActiveNow(activatesAt: Date, expiresAt: Date, endedEarly: boolean): boolean {
  if (endedEarly) return false;
  const now = Date.now();
  return activatesAt.getTime() <= now && now <= expiresAt.getTime();
}

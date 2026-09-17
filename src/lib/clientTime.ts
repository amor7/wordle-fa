"use client";

const TZ = "Asia/Tehran";

function tehranDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "HH:MM" in Tehran local time. */
export function formatTehranClock(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "امروز" | "فردا" | "۱۲ مهر" relative to the current Tehran-local day. */
export function formatTehranDayLabel(iso: string): string {
  const target = new Date(iso);
  const now = new Date();
  const todayKey = tehranDateKey(now);
  const targetKey = tehranDateKey(target);
  if (targetKey === todayKey) return "امروز";
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  if (targetKey === tehranDateKey(tomorrow)) return "فردا";
  return new Intl.DateTimeFormat("fa-IR", { timeZone: TZ, month: "long", day: "numeric" }).format(target);
}

/** e.g. "امروز ساعت ۲۳:۵۹" */
export function formatTehranWhen(iso: string): string {
  return `${formatTehranDayLabel(iso)} ساعت ${formatTehranClock(iso)}`;
}

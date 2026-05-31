export type MarketStatus = "open" | "pre" | "after" | "closed";

export interface MarketInfo {
  status:        MarketStatus;
  statusThai:    string;
  minsToChange:  number | null;
  nextEventThai: string;
}

const PRE_START = 4 * 60;       // 4:00 AM ET
const MKT_OPEN  = 9 * 60 + 30;  // 9:30 AM ET
const MKT_CLOSE = 16 * 60;      // 4:00 PM ET
const AFTER_END = 20 * 60;      // 8:00 PM ET

const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function getMarketInfo(now = new Date()): MarketInfo {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday:  "short",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
  }).formatToParts(now);

  const weekday  = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const h        = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
  const m        = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const day      = DAY_MAP[weekday] ?? 0;
  const timeMin  = h * 60 + m;
  const isWeekday = day >= 1 && day <= 5;

  if (isWeekday && timeMin >= MKT_OPEN && timeMin < MKT_CLOSE) {
    return { status: "open",   statusThai: "ตลาดเปิด",    minsToChange: MKT_CLOSE - timeMin, nextEventThai: "ปิดตลาด" };
  }
  if (isWeekday && timeMin >= PRE_START && timeMin < MKT_OPEN) {
    return { status: "pre",    statusThai: "Pre-market",   minsToChange: MKT_OPEN - timeMin,  nextEventThai: "เปิดตลาด" };
  }
  if (isWeekday && timeMin >= MKT_CLOSE && timeMin < AFTER_END) {
    return { status: "after",  statusThai: "After-hours",  minsToChange: AFTER_END - timeMin, nextEventThai: "หลังตลาดปิด" };
  }

  const nextThai = (day === 5 && timeMin >= AFTER_END) || day === 6
    ? "เปิดวันจันทร์"
    : "เปิดพรุ่งนี้";

  return { status: "closed", statusThai: "ตลาดปิด", minsToChange: null, nextEventThai: nextThai };
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type MarketStatus = "open" | "pre" | "after" | "closed";

export interface MarketInfo {
  status:        MarketStatus;
  statusThai:    string;
  secsToChange:  number | null;
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
    second:   "2-digit",
    hour12:   false,
  }).formatToParts(now);

  const weekday   = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const h         = parseInt(parts.find((p) => p.type === "hour")?.value   ?? "0", 10) % 24;
  const m         = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const s         = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10);
  const day       = DAY_MAP[weekday] ?? 0;
  const timeSec   = h * 3600 + m * 60 + s;
  const isWeekday = day >= 1 && day <= 5;

  const PRE_START_S = PRE_START * 60;
  const MKT_OPEN_S  = MKT_OPEN  * 60;
  const MKT_CLOSE_S = MKT_CLOSE * 60;
  const AFTER_END_S = AFTER_END * 60;

  if (isWeekday && timeSec >= MKT_OPEN_S && timeSec < MKT_CLOSE_S) {
    return { status: "open",   statusThai: "ตลาดเปิด",   secsToChange: MKT_CLOSE_S - timeSec, nextEventThai: "ปิดตลาด" };
  }
  if (isWeekday && timeSec >= PRE_START_S && timeSec < MKT_OPEN_S) {
    return { status: "pre",    statusThai: "Pre-market",  secsToChange: MKT_OPEN_S  - timeSec, nextEventThai: "เปิดตลาด" };
  }
  if (isWeekday && timeSec >= MKT_CLOSE_S && timeSec < AFTER_END_S) {
    return { status: "after",  statusThai: "After-hours", secsToChange: AFTER_END_S - timeSec, nextEventThai: "หลังตลาดปิด" };
  }

  const nextThai =
    (day === 5 && timeSec >= AFTER_END_S) || day === 6
      ? "เปิดวันจันทร์"
      : isWeekday && timeSec < PRE_START_S
      ? "เปิดวันนี้ เวลา 9:30 น."
      : "เปิดพรุ่งนี้";

  return { status: "closed", statusThai: "ตลาดปิด", secsToChange: null, nextEventThai: nextThai };
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

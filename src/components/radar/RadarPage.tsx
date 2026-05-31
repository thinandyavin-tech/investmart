"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { CategoryBadge } from "@/components/radar/CategoryBadge";
import { ScoreBadge } from "@/components/radar/ScoreBadge";
import { StockDetailPanel } from "@/components/radar/StockDetailPanel";
import type { StockMetrics, CapSize } from "@/lib/momentum";
import type { Universe } from "@/lib/stockUniverse";

const TIMEFRAMES = ["1D", "5D", "1M", "3M", "6M", "1Y"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const CAP_OPTIONS: { value: CapSize; label: string }[] = [
  { value: "ALL",   label: "ทั้งหมด" },
  { value: "SMALL", label: "Small < $300M" },
  { value: "MID",   label: "Mid $300M–$100B" },
  { value: "BIG",   label: "Big $100B+" },
];

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toFixed(0)}`;
}

function capTier(cap: number): string {
  if (cap >= 100_000_000_000) return "Big";
  if (cap >= 300_000_000)     return "Mid";
  return "Small";
}

export function RadarPage() {
  const [universe, setUniverse]     = useState<Universe>("SP500");
  const [timeframe, setTimeframe]   = useState<Timeframe>("1D");
  const [capSize, setCapSize]       = useState<CapSize>("ALL");
  const [filterDead, setFilterDead] = useState(true);
  const [filterRetail, setFilterRetail] = useState(false);
  const [minScore, setMinScore]     = useState(20);
  const [search, setSearch]         = useState("");
  const [scanning, setScanning]         = useState(false);
  const [progress, setProgress]         = useState(0);
  const [stocks, setStocks]             = useState<StockMetrics[]>([]);
  const [selected, setSelected]         = useState<StockMetrics | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string>("");
  const [totalScanned, setTotalScanned] = useState(0);
  const [scanElapsed, setScanElapsed]   = useState("00:00");
  const [fromCache, setFromCache]       = useState(false);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);
  const scanStartRef = useRef<number>(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const runScan = useCallback(async (force = false) => {
    setScanning(true);
    setProgress(0);
    setStocks([]);
    scanStartRef.current = Date.now();

    // Only run the elapsed-time ticker for non-cached scans
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - scanStartRef.current) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const s = String(elapsed % 60).padStart(2, "0");
      setScanElapsed(`${m}:${s}`);
    }, 1000);

    // Animate progress bar while fetching
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(95, p + Math.random() * 8));
    }, 400);

    try {
      const params = new URLSearchParams({
        universe,
        minScore: String(minScore),
        capSize,
        filterDead: String(filterDead),
      });
      if (force) params.set("force", "true");
      const res  = await fetch(`/api/radar/scan?${params}`);
      const data = (await res.json()) as {
        results:    StockMetrics[];
        total:      number;
        scannedAt:  string;
        cached:     boolean;
        refreshing: boolean;
      };
      setStocks(data.results ?? []);
      setTotalScanned(data.total ?? 0);
      setFromCache(data.cached ?? false);
      setCacheRefreshing(data.refreshing ?? false);
      setProgress(100);

      if (data.cached && data.scannedAt) {
        // Show the server-side scan timestamp for cached results
        const cached = new Date(data.scannedAt);
        setLastScanTime(
          cached.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) +
          " " + cached.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
        );
      } else {
        const now = new Date();
        setLastScanTime(
          now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) +
          " " + now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
        );
      }

      if (data.results?.length > 0 && !selected) {
        setSelected(data.results[0]);
      }
    } catch {
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      if (timerRef.current) clearInterval(timerRef.current);
      setScanning(false);
    }
  }, [universe, minScore, capSize, filterDead, selected]);

  // Auto-scan on mount
  useEffect(() => {
    void runScan(false);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStocks = stocks.filter((s) => {
    if (search) {
      const q = search.toUpperCase();
      return s.ticker.includes(q) || s.companyName.toUpperCase().includes(q);
    }
    return true;
  });

  const maxSurge     = stocks.reduce((m, s) => Math.max(m, s.volumeSurge), 0);
  const maxBreakout  = stocks.reduce((m, s) => Math.max(m, s.breakoutScore), 0);
  const avgQuality   = stocks.length
    ? Math.round(stocks.reduce((s, x) => s + x.qualityScore, 0) / stocks.length)
    : 0;

  return (
    <div className="flex min-h-screen">
      {/* Left config column */}
      <aside className="w-52 flex-shrink-0 border-r border-[#1F1A14] p-3 flex flex-col gap-3 bg-[#F3EDE0]">
        {/* Universe selector */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2">เลือกกลุ่มหุ้น</div>
          {(
            [
              {
                id: "SP500" as Universe,
                title: "S&P 500",
                desc: "หุ้นบริษัทใหญ่อเมริกา · 500 ตัว",
                icon: "📈",
              },
              {
                id: "NASDAQ100" as Universe,
                title: "Nasdaq 100",
                desc: "หุ้น tech อเมริกา · 100 ตัว",
                icon: "💻",
              },
              {
                id: "CEO" as Universe,
                title: "CEO Profile",
                desc: "ดูพอร์ตของผู้สร้างเว็บ",
                icon: "👤",
              },
            ] as const
          ).map(({ id, title, desc, icon }) => (
            <button
              key={id}
              onClick={() => setUniverse(id)}
              className="w-full text-left p-2 border border-[#1F1A14] mb-1.5 text-[10px] transition-all"
              style={{
                background:  universe === id ? "#1F1A14"  : "#F3EDE0",
                color:       universe === id ? "#F3EDE0"  : "#1F1A14",
                boxShadow:   universe === id ? "none"     : "2px 2px 0 #FF3D9A",
              }}
            >
              <div className="flex items-center gap-1 font-bold">
                <span>{icon}</span>
                <span>{title}</span>
              </div>
              <div
                className="text-[9px] mt-0.5"
                style={{ color: universe === id ? "#9BE15D" : "#8A8378" }}
              >
                {desc}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          <OffsetButton onClick={() => void runScan(false)} disabled={scanning} size="md" className="flex-1 text-center">
            {scanning ? "▶ กำลังสแกน..." : "▶ RE: SCAN"}
          </OffsetButton>
          <OffsetButton onClick={() => void runScan(true)} disabled={scanning} size="md" title="บังคับสแกนใหม่ ข้ามแคช">
            ↺
          </OffsetButton>
        </div>

        {/* Database status */}
        <div
          className="border border-[#1F1A14] p-2 text-[10px] bg-[#FBF7ED]"
          style={{ boxShadow: "2px 2px 0 #FF3D9A" }}
        >
          <div className="flex justify-between mb-1">
            <span className="text-[#8A8378]">ฐานข้อมูล</span>
            <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              {totalScanned.toLocaleString()} หุ้น
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span>
              <span className="text-[#8A8378]">เวลาที่ใช้ </span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{scanElapsed}</span>
            </span>
            <span>
              <span className="text-[#8A8378]">เหลือ </span>
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {scanning ? "..." : "00:00"}
              </span>
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-[#E0D9CC] border border-[#1F1A14] mb-1">
            <div
              className="h-full bg-scan-gradient transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[9px] text-[#8A8378]">
            {scanning
              ? "กำลังสแกน..."
              : fromCache
                ? `ผลจากแคช · อัพเดท ${lastScanTime}${cacheRefreshing ? " · กำลังรีเฟรช..." : ""}`
                : `เรดาร์สแกนพร้อมใช้งาน · อัพเดทล่าสุด ${lastScanTime}`}
          </div>
        </div>

        {/* Timeframe */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5">ช่วงเวลา</div>
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="px-2 py-0.5 text-[10px] border border-[#1F1A14] font-bold"
                style={{
                  background: timeframe === tf ? "#1F1A14" : "#F3EDE0",
                  color:      timeframe === tf ? "#F3EDE0" : "#1F1A14",
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Cap size */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5">ขนาดบริษัท</div>
          <select
            value={capSize}
            onChange={(e) => setCapSize(e.target.value as CapSize)}
            className="w-full border border-[#1F1A14] bg-[#FBF7ED] text-[10px] px-2 py-1"
          >
            {CAP_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-[10px] cursor-pointer">
            <input
              type="checkbox"
              checked={filterDead}
              onChange={(e) => setFilterDead(e.target.checked)}
              className="border border-[#1F1A14]"
            />
            กรองหุ้นศพกระตุก
          </label>
          <label className="flex items-center gap-2 text-[10px] cursor-pointer">
            <input
              type="checkbox"
              checked={filterRetail}
              onChange={(e) => setFilterRetail(e.target.checked)}
              className="border border-[#1F1A14]"
            />
            กรองหุ้นเม่าเกาะ
          </label>
        </div>

        {/* Score slider */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-bold uppercase tracking-wide">Momentum Score</span>
            <span className="font-bold" style={{ fontFamily: "var(--font-mono)" }}>{minScore}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full h-1.5 appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #5B8A2A 0%, #FF3D9A ${minScore}%, #E0D9CC ${minScore}%)`,
            }}
          />
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="เช่น AAPL หรือ apple"
            className="w-full border border-[#1F1A14] bg-[#FBF7ED] text-[10px] px-2 py-1 placeholder:text-[#8A8378]"
          />
        </div>

        {/* PWA install card */}
        <div
          className="border border-[#1F1A14] p-2 text-[9px] bg-[#FBF7ED] mt-auto"
          style={{ boxShadow: "2px 2px 0 #FF3D9A" }}
        >
          <div className="flex items-center gap-1 font-bold text-[10px] mb-0.5">
            <span>📱 ดาวน์โหลดแอพ</span>
            <span
              className="px-1 py-0.5 font-bold text-[8px]"
              style={{ background: "#1F1A14", color: "#9BE15D" }}
            >
              NEW
            </span>
          </div>
          <div className="text-[#8A8378]">เพิ่มไปยังหน้าจอโฮม · ฟรี</div>
        </div>
      </aside>

      {/* Center — momentum intelligence */}
      <section className="w-80 flex-shrink-0 border-r border-[#1F1A14] p-3 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-widest">
              MOMENTUM INTELLIGENCE
            </h2>
            <p className="text-[10px] text-[#8A8378]">หุ้นที่เริ่มส่งสัญญาณแรงผิดปกติ 📡</p>
          </div>
          <OffsetButton size="sm">&gt; copy</OffsetButton>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "ติดเรดาร์",            value: String(filteredStocks.length) },
            { label: "VOLUME SURGE สูงสุด", value: `${maxSurge.toFixed(1)}x` },
            { label: "BREAKOUT SCORE สูงสุด", value: String(maxBreakout) },
            { label: "QUALITY เฉลี่ย",       value: String(avgQuality) },
          ].map(({ label, value }) => (
            <Card key={label} className="p-1.5 text-center">
              <div className="text-[9px] text-[#8A8378] uppercase tracking-wide leading-tight mb-0.5">
                {label}
              </div>
              <div
                className="text-sm font-bold"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {value}
              </div>
            </Card>
          ))}
        </div>

        {/* Category badges */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5">
            Radar ranking
          </div>
          <p className="text-[9px] text-[#8A8378] mb-2">
            เรียงจาก % ราคาที่เพิ่มขึ้นเป็นหลัก พร้อมคะแนน momentum
          </p>
          <div className="grid grid-cols-4 gap-1">
            {(["TOP100", "DARK_HORSE", "REVIVED", "STRONG"] as const).map((cat) => (
              <CategoryBadge key={cat} category={cat} />
            ))}
          </div>
        </div>

        {/* Ranking table */}
        <div className="flex-1 overflow-y-auto">
          {scanning && (
            <div className="text-center text-xs text-[#8A8378] py-6">
              กำลังสแกน...
            </div>
          )}
          {!scanning && filteredStocks.length === 0 && (
            <div className="text-center text-xs text-[#8A8378] py-6">
              ไม่พบหุ้น — ลองปรับตัวกรอง
            </div>
          )}
          {filteredStocks.map((stock, i) => (
            <button
              key={stock.ticker}
              onClick={() => setSelected(stock)}
              className="w-full text-left border-b border-[#1F1A14] p-2 flex items-center gap-2 hover:bg-[#E8E2D4] transition-colors"
              style={{
                background: selected?.ticker === stock.ticker ? "#1F1A14" : undefined,
                color:      selected?.ticker === stock.ticker ? "#F3EDE0" : "#1F1A14",
              }}
            >
              <span
                className="text-[9px] font-bold w-4 text-right flex-shrink-0"
                style={{ color: selected?.ticker === stock.ticker ? "#8A8378" : "#8A8378" }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold">{stock.ticker}</span>
                  {i === 0 && <span className="text-[10px]">🔥</span>}
                </div>
                <div
                  className="text-[9px] truncate"
                  style={{ color: selected?.ticker === stock.ticker ? "#8A8378" : "#8A8378" }}
                >
                  {stock.companyName.slice(0, 22)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className="text-[10px] font-bold"
                  style={{ color: stock.change1D >= 0 ? "#5B8A2A" : "#E5484D" }}
                >
                  {stock.change1D >= 0 ? "+" : ""}{stock.change1D.toFixed(2)}%
                </div>
                <div
                  className="text-[9px]"
                  style={{ color: selected?.ticker === stock.ticker ? "#8A8378" : "#8A8378" }}
                >
                  RSI {stock.rsi}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Right — stock detail */}
      <section className="flex-1 overflow-y-auto">
        {selected ? (
          <StockDetailPanel stock={selected} timeframe={timeframe} />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-[#8A8378]">
            เลือกหุ้นจากตารางด้านซ้ายเพื่อดูรายละเอียด
          </div>
        )}
      </section>
    </div>
  );
}

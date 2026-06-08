import Link from "next/link";
import type { CompareRow } from "@/lib/compareTypes";

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmtCap(b: number | null): string {
  if (!b) return "—";
  if (b >= 1000) return `$${(b / 1000).toFixed(1)}T`;
  return `$${b.toFixed(1)}B`;
}

export function fmtVol(v: number | null): string {
  if (!v) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

export function Chg({ v }: { v: number | null }) {
  if (v == null) return <span className="text-[#8A8378]">—</span>;
  const pos = v >= 0;
  return (
    <span className={`font-mono text-xs font-bold ${pos ? "text-green-600" : "text-red-500"}`}>
      {pos ? "+" : ""}{v.toFixed(2)}%
    </span>
  );
}

export function RangeBar({ price, low, high }: { price: number | null; low: number | null; high: number | null }) {
  if (!price || !low || !high || high <= low) return <span className="text-[#8A8378]">—</span>;
  const pct = Math.max(0, Math.min(1, (price - low) / (high - low)));
  return (
    <div>
      <div className="relative h-1 bg-[#E8E2D4] w-28">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[#1F1A14] rounded-sm"
          style={{ left: `${pct * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-[#8A8378] mt-0.5 w-28">
        <span>${low.toFixed(0)}</span>
        <span>${high.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

export function MobileCard({ row, metrics }: { row: CompareRow; metrics: MetricDef[] }) {
  return (
    <div className="border border-[#1F1A14] bg-[#F3EDE0] p-4" style={{ boxShadow: "2px 2px 0 #1F1A14" }}>
      <div className="flex items-center justify-between mb-3">
        <Link href={`/stock/${row.ticker}`} className="font-bold text-sm text-[#1F1A14] hover:underline font-mono">
          {row.ticker}
        </Link>
        <span className="text-xs text-[#8A8378] truncate max-w-[180px]">{row.name}</span>
      </div>
      <div className="space-y-2.5">
        {metrics.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-3">
            <span className="text-xs text-[#8A8378] flex-shrink-0">{m.label}</span>
            <span className="text-right">{m.cell(row)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Metric definitions ───────────────────────────────────────────────────────

export interface MetricDef {
  id:        string;
  label:     string;
  sublabel?: string;
  cell:      (row: CompareRow) => React.ReactNode;
}

export const METRICS: MetricDef[] = [
  {
    id: "price", label: "ราคา", sublabel: "เปลี่ยน 1D",
    cell: (row) => (
      <div>
        <div className="font-mono text-xs font-bold text-[#1F1A14]">
          {row.price != null ? `$${row.price.toFixed(2)}` : "—"}
        </div>
        <Chg v={row.change1D} />
      </div>
    ),
  },
  { id: "1w", label: "เปลี่ยน 1 สัปดาห์",  cell: (row) => <Chg v={row.change1W} /> },
  { id: "1m", label: "เปลี่ยน 1 เดือน",    cell: (row) => <Chg v={row.change1M} /> },
  { id: "3m", label: "เปลี่ยน 3 เดือน",    cell: (row) => <Chg v={row.change3M} /> },
  {
    id: "mcap", label: "Market Cap",
    cell: (row) => <span className="font-mono text-xs">{fmtCap(row.marketCapB)}</span>,
  },
  {
    id: "pe", label: "P/E TTM",
    cell: (row) => <span className="font-mono text-xs">{row.pe != null ? `${row.pe.toFixed(1)}×` : "—"}</span>,
  },
  {
    id: "peg", label: "PEG Ratio", sublabel: "P/E ÷ EPS Growth 3Y",
    cell: (row) => {
      if (row.pegRatio == null) return <span className="text-[#8A8378]">—</span>;
      const color = row.pegRatio < 1 ? "text-green-600" : row.pegRatio > 2 ? "text-red-500" : "text-[#1F1A14]";
      return <span className={`font-mono text-xs font-bold ${color}`}>{row.pegRatio.toFixed(2)}</span>;
    },
  },
  {
    id: "beta", label: "Beta",
    cell: (row) => {
      if (row.beta == null) return <span className="text-[#8A8378]">—</span>;
      const label = row.beta < 0.8 ? "Conservative" : row.beta <= 1.2 ? "Moderate" : "Aggressive";
      const color = row.beta < 0.8 ? "text-blue-600" : row.beta <= 1.2 ? "text-amber-600" : "text-red-500";
      return (
        <span>
          <span className="font-mono text-xs">{row.beta.toFixed(2)}</span>
          <span className={`ml-1 text-xs ${color}`}>{label}</span>
        </span>
      );
    },
  },
  {
    id: "rsi", label: "RSI-14",
    cell: (row) => {
      if (row.rsi == null) return <span className="text-[#8A8378]">—</span>;
      const label = row.rsi >= 70 ? "Overbought" : row.rsi <= 30 ? "Oversold" : "Neutral";
      const color = row.rsi >= 70 ? "text-red-500" : row.rsi <= 30 ? "text-green-600" : "text-[#8A8378]";
      return (
        <span>
          <span className="font-mono text-xs font-bold">{row.rsi}</span>
          <span className={`ml-1 text-xs ${color}`}>{label}</span>
        </span>
      );
    },
  },
  {
    id: "52w", label: "52W Range",
    cell: (row) => <RangeBar price={row.price} low={row.low52W} high={row.high52W} />,
  },
  {
    id: "vol", label: "Vol เฉลี่ย 10D",
    cell: (row) => <span className="font-mono text-xs">{fmtVol(row.volumeAvg10D)}</span>,
  },
];

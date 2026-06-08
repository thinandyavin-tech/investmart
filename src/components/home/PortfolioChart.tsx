"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/Card";

interface Snapshot {
  valueThb:  number;
  createdAt: string;
}

const STARTING_THB = 1_250_000;

export function PortfolioChart() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading]     = useState(true);
  const containerRef              = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef                  = useRef<any>(null);

  useEffect(() => {
    fetch("/api/portfolio/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.snapshots) setSnapshots(d.snapshots as Snapshot[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current || snapshots.length < 2) return;

    let destroyed = false;

    async function init() {
      const { createChart, AreaSeries, ColorType } = await import("lightweight-charts");
      if (destroyed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width:  containerRef.current.clientWidth,
        height: 100,
        layout: {
          background:  { type: ColorType.Solid, color: "transparent" },
          textColor:   "#8A8378",
          fontFamily:  "var(--font-mono)",
          fontSize:    9,
        },
        grid:        { vertLines: { visible: false }, horzLines: { color: "#E8E2D4" } },
        crosshair:   { vertLine: { visible: false }, horzLine: { visible: false } },
        rightPriceScale: { visible: false },
        leftPriceScale:  { visible: false },
        timeScale:       { visible: false },
        handleScroll:    false,
        handleScale:     false,
      });

      const series = chart.addSeries(AreaSeries, {
        lineColor:    "#5B8A2A",
        topColor:     "rgba(91,138,42,0.18)",
        bottomColor:  "rgba(91,138,42,0)",
        lineWidth:    2,
        priceLineVisible: false,
      });

      const points = snapshots.map((s) => ({
        time:  Math.floor(new Date(s.createdAt).getTime() / 1000) as import("lightweight-charts").UTCTimestamp,
        value: s.valueThb,
      }));
      series.setData(points);
      chart.timeScale().fitContent();

      chartRef.current = chart;
    }

    void init();

    const obs = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    obs.observe(containerRef.current);

    return () => {
      destroyed = true;
      obs.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [snapshots, loading]);

  if (loading) {
    return (
      <Card className="p-3">
        <div className="h-24 animate-pulse bg-[#E8E2D4] rounded" />
      </Card>
    );
  }

  if (snapshots.length < 2) {
    return (
      <div
        className="bg-[#F3EDE0] p-3"
        style={{ border: "2px dashed #5B8A2A" }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#5B8A2A]">
            กราฟพอร์ตโฟลิโอ
          </h2>
          <span className="text-xs text-[#8A8378]">พอร์ตจำลอง</span>
        </div>
        <div className="h-16 flex items-center justify-center border border-dashed border-[#5B8A2A]">
          <span className="text-xs text-[#8A8378]">กราฟจะแสดงหลังจากซื้อขายครั้งแรก</span>
        </div>
      </div>
    );
  }

  const latest   = snapshots[snapshots.length - 1].valueThb;
  const earliest = snapshots[0].valueThb;
  const change   = latest - earliest;
  const changePct = (change / earliest) * 100;
  const pnlVsBase = latest - STARTING_THB;
  const pnlPct    = (pnlVsBase / STARTING_THB) * 100;
  const positive  = pnlVsBase >= 0;

  return (
    <div className="bg-[#F3EDE0] p-3" style={{ border: "2px dashed #5B8A2A" }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#5B8A2A]">
          กราฟพอร์ตโฟลิโอ
        </h2>
        <span
          className="text-xs font-bold"
          style={{ fontFamily: "var(--font-mono)", color: positive ? "#5B8A2A" : "#DC2626" }}
        >
          {positive ? "+" : ""}{pnlPct.toFixed(2)}% vs เริ่มต้น
        </span>
      </div>
      <div className="text-xs font-bold mb-1" style={{ fontFamily: "var(--font-mono)" }}>
        ฿{Math.round(latest).toLocaleString("th-TH")}
        <span
          className="text-xs ml-2"
          style={{ color: change >= 0 ? "#5B8A2A" : "#DC2626" }}
        >
          {change >= 0 ? "+" : ""}{changePct.toFixed(2)}% ช่วงนี้
        </span>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: 100 }} />
    </div>
  );
}

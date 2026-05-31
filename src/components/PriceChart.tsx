"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  HistogramSeries,
  ColorType,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";

interface Candle {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

interface PriceChartProps {
  candles:    Candle[];
  mode:       "Price" | "Relative" | "Volume";
  simulated?: boolean;
  height?:    number;
}

export function PriceChart({ candles, mode, simulated, height = 160 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length < 2) return;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#F3EDE0" },
        textColor:  "#8A8378",
        fontSize:   10,
      },
      grid: {
        vertLines: { color: "#E8E2D4" },
        horzLines: { color: "#E8E2D4" },
      },
      rightPriceScale: { borderColor: "#1F1A14" },
      timeScale:       { borderColor: "#1F1A14", timeVisible: true },
      crosshair: {
        vertLine: { color: "#8A8378", labelBackgroundColor: "#1F1A14" },
        horzLine: { color: "#8A8378", labelBackgroundColor: "#1F1A14" },
      },
    });
    chartRef.current = chart;

    const firstClose = candles[0].close;
    const lastClose  = candles[candles.length - 1].close;
    const lineColor  = lastClose >= firstClose ? "#5B8A2A" : "#E5484D";

    if (mode === "Volume") {
      const series = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      series.setData(
        candles.map((c) => ({
          time:  c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? "#5B8A2A44" : "#E5484D44",
        }))
      );
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
    } else {
      const values = candles.map((c) => ({
        time:  c.time as UTCTimestamp,
        value: mode === "Relative"
          ? ((c.close - firstClose) / firstClose) * 100
          : c.close,
      }));

      const area = chart.addSeries(AreaSeries, {
        topColor:    lineColor + "33",
        bottomColor: lineColor + "00",
        lineColor,
        lineWidth:   2,
        priceFormat: mode === "Relative"
          ? { type: "percent", precision: 2, minMove: 0.01 }
          : { type: "price",   precision: 2, minMove: 0.01 },
        lastValueVisible:  true,
        priceLineVisible:  true,
        priceLineColor:    lineColor,
      });
      area.setData(values);
    }

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, mode, height]);

  return (
    <div className="relative border border-[#1F1A14] bg-[#F3EDE0]" style={{ height }}>
      {simulated && (
        <div
          className="absolute top-1 right-1 text-[8px] px-1 z-10"
          style={{ background: "#FFD9E8", color: "#D6336C" }}
        >
          simulated
        </div>
      )}
      {candles.length < 2 && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#8A8378] z-10">
          {candles.length === 0 ? "กำลังโหลด..." : "ไม่มีข้อมูลกราฟ"}
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

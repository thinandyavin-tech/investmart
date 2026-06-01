"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  type IChartApi,
  type UTCTimestamp,
  type LogicalRangeChangeEventHandler,
} from "lightweight-charts";

interface Candle {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

interface MaConfig {
  ma20?:  boolean;
  ma50?:  boolean;
  ma200?: boolean;
}

interface PriceChartProps {
  candles:    Candle[];
  mode:       "Price" | "Relative" | "Volume";
  simulated?: boolean;
  height?:    number;
  /** Use compact area sparkline regardless of mode (for small cards) */
  mini?:      boolean;
  ma?:        MaConfig;
}

function computeMA(closes: number[], period: number): ({ time: UTCTimestamp; value: number } | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return { time: 0 as UTCTimestamp, value: slice.reduce((a, b) => a + b, 0) / period };
  });
}

const COLORS = {
  bg:        "#F3EDE0",
  grid:      "#E8E2D4",
  border:    "#1F1A14",
  text:      "#8A8378",
  up:        "#5B8A2A",
  down:      "#E5484D",
  upFill:    "#5B8A2A44",
  downFill:  "#E5484D44",
  upLight:   "#5B8A2A22",
  downLight: "#E5484D22",
} as const;

const BASE_OPTIONS = {
  layout: {
    background: { type: ColorType.Solid, color: COLORS.bg },
    textColor:  COLORS.text,
    fontSize:   10,
  },
  grid: {
    vertLines: { color: COLORS.grid },
    horzLines: { color: COLORS.grid },
  },
  rightPriceScale: {
    borderColor:  COLORS.border,
    scaleMargins: { top: 0.08, bottom: 0.08 },
    autoScale:    true,
  },
  timeScale: {
    borderColor:   COLORS.border,
    timeVisible:   true,
    minBarSpacing: 0.5,
    fixLeftEdge:   true,
    fixRightEdge:  true,
  },
  crosshair: {
    vertLine: { color: COLORS.text, labelBackgroundColor: COLORS.border },
    horzLine: { color: COLORS.text, labelBackgroundColor: COLORS.border },
  },
  handleScroll: {
    mouseWheel:       true,
    pressedMouseMove: true,
    horzTouchDrag:    true,
    vertTouchDrag:    false,
  },
  handleScale: {
    mouseWheel: true,
    pinch:      true,
    axisPressedMouseMove: { time: true, price: false },
  },
} as const;

export function PriceChart({ candles, mode, simulated, height = 160, mini = false, ma }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);

  // True candlestick+volume layout only for full-size Price mode
  const useCandlestick = mode === "Price" && !mini;

  useEffect(() => {
    if (!containerRef.current || candles.length < 2) return;


    const el   = containerRef.current;
    const up   = candles[candles.length - 1].close >= candles[0].close;
    const color = up ? COLORS.up : COLORS.down;

    // ── Volume mode ──────────────────────────────────────────────────────────
    if (mode === "Volume") {
      const chart = createChart(el, { ...BASE_OPTIONS, width: el.clientWidth, height });
      chartRef.current = chart;

      const vol = chart.addSeries(HistogramSeries, {
        priceScaleId: "vol",
        priceFormat:  { type: "volume" },
      });
      vol.setData(
        candles.map((c) => ({
          time:  c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? COLORS.upFill : COLORS.downFill,
        }))
      );
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el) chart.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);
      return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
    }

    // ── Relative mode ─────────────────────────────────────────────────────────
    if (mode === "Relative") {
      const chart = createChart(el, { ...BASE_OPTIONS, width: el.clientWidth, height });
      chartRef.current = chart;

      const first = candles[0].close;
      const area  = chart.addSeries(AreaSeries, {
        topColor:    color + "33",
        bottomColor: color + "00",
        lineColor:   color,
        lineWidth:   2,
        priceFormat: { type: "percent", precision: 2, minMove: 0.01 },
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineColor:   color,
      });
      area.setData(
        candles.map((c) => ({
          time:  c.time as UTCTimestamp,
          value: ((c.close - first) / first) * 100,
        }))
      );
      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el) chart.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);
      return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
    }

    // ── Price mode — mini sparkline (area) ────────────────────────────────────
    if (mini) {
      const chart = createChart(el, { ...BASE_OPTIONS, width: el.clientWidth, height });
      chartRef.current = chart;

      const area = chart.addSeries(AreaSeries, {
        topColor:    color + "33",
        bottomColor: color + "00",
        lineColor:   color,
        lineWidth:   2,
        priceFormat:      { type: "price", precision: 2, minMove: 0.01 },
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineColor:   color,
      });
      area.setData(
        candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
      );
      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el) chart.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);
      return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
    }

    // ── Price mode — full candlestick + volume pane ────────────────────────────
    const volH    = Math.round(height * 0.25);
    const candleH = height - volH;

    const candleEl = el.querySelector<HTMLDivElement>(".chart-candle")!;
    const volEl    = el.querySelector<HTMLDivElement>(".chart-vol")!;

    const candleChart = createChart(candleEl, {
      ...BASE_OPTIONS,
      width:  el.clientWidth,
      height: candleH,
      timeScale: { ...BASE_OPTIONS.timeScale, visible: false },
    });

    const volChart = createChart(volEl, {
      ...BASE_OPTIONS,
      width:  el.clientWidth,
      height: volH,
      layout: { ...BASE_OPTIONS.layout, fontSize: 9 },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: "transparent" } },
      crosshair: {
        vertLine: { color: COLORS.text, labelBackgroundColor: COLORS.border },
        horzLine: { visible: false, labelVisible: false },
      },
    });

    chartRef.current = candleChart;

    const candleSeries = candleChart.addSeries(CandlestickSeries, {
      upColor:         COLORS.up,
      downColor:       COLORS.down,
      borderUpColor:   COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor:     COLORS.up,
      wickDownColor:   COLORS.down,
      priceFormat:     { type: "price", precision: 2, minMove: 0.01 },
    });
    candleSeries.setData(
      candles.map((c) => ({
        time:  c.time as UTCTimestamp,
        open:  c.open,
        high:  c.high,
        low:   c.low,
        close: c.close,
      }))
    );

    // MA overlays
    if (ma && candles.length >= 20) {
      const closes = candles.map((c) => c.close);
      const maOptions = [
        { period: 20,  enabled: ma.ma20,  color: "#2563EB" },
        { period: 50,  enabled: ma.ma50,  color: "#D97706" },
        { period: 200, enabled: ma.ma200, color: "#7C3AED" },
      ];
      for (const { period, enabled, color } of maOptions) {
        if (!enabled || candles.length < period) continue;
        const maSeries = candleChart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        const maRaw = computeMA(closes, period);
        maSeries.setData(
          candles
            .map((c, i) => (maRaw[i] ? { time: c.time as UTCTimestamp, value: maRaw[i]!.value } : null))
            .filter((d): d is { time: UTCTimestamp; value: number } => d !== null)
        );
      }
    }

    const volSeries = volChart.addSeries(HistogramSeries, {
      priceScaleId: "vol",
      priceFormat:  { type: "volume" },
    });
    volSeries.setData(
      candles.map((c) => ({
        time:  c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? COLORS.upLight : COLORS.downLight,
      }))
    );
    volChart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });

    candleChart.timeScale().fitContent();

    // Sync time scales — guard flag prevents circular updates
    let syncing = false;
    const onCandleRangeChange: LogicalRangeChangeEventHandler = (range) => {
      if (syncing || !range) return;
      syncing = true;
      volChart.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };
    const onVolRangeChange: LogicalRangeChangeEventHandler = (range) => {
      if (syncing || !range) return;
      syncing = true;
      candleChart.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };
    candleChart.timeScale().subscribeVisibleLogicalRangeChange(onCandleRangeChange);
    volChart.timeScale().subscribeVisibleLogicalRangeChange(onVolRangeChange);

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      candleChart.applyOptions({ width: w });
      volChart.applyOptions({ width: w });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      candleChart.timeScale().unsubscribeVisibleLogicalRangeChange(onCandleRangeChange);
      volChart.timeScale().unsubscribeVisibleLogicalRangeChange(onVolRangeChange);
      candleChart.remove();
      volChart.remove();
      chartRef.current = null;
    };
  }, [candles, mode, height, mini, ma]);

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
      {useCandlestick ? (
        <div ref={containerRef} className="w-full h-full flex flex-col">
          <div className="chart-candle w-full" style={{ height: `${Math.round(height * 0.75)}px` }} />
          <div className="chart-vol   w-full" style={{ height: `${Math.round(height * 0.25)}px` }} />
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
}

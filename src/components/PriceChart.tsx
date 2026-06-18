"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
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

export interface MaConfig {
  ma20?:  boolean;
  ma50?:  boolean;
  ma200?: boolean;
}

interface PriceChartProps {
  candles:    Candle[];
  mode:       "Price" | "Relative" | "Volume";
  simulated?: boolean;
  height?:    number;
  /** Compact area sparkline regardless of mode (for small cards) */
  mini?:      boolean;
  ma?:        MaConfig;
  showRsi?:   boolean;
}

function computeMA(closes: number[], period: number): ({ time: UTCTimestamp; value: number } | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return { time: 0 as UTCTimestamp, value: slice.reduce((a, b) => a + b, 0) / period };
  });
}

function computeRSISeries(closes: number[], period = 14): (number | null)[] {
  if (closes.length <= period) return closes.map(() => null);

  const result: (number | null)[] = Array(period).fill(null);
  const changes = closes.slice(1).map((c, i) => c - closes[i]);

  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss -= changes[i];
  }
  avgGain /= period;
  avgLoss /= period;

  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < changes.length; i++) {
    const gain = Math.max(0, changes[i]);
    const loss = Math.max(0, -changes[i]);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return result;
}

const COLORS = {
  bg:        "#FFFFFF",
  grid:      "#F1F5F9",
  border:    "#E2E8F0",
  text:      "#64748B",
  up:        "#16A34A",
  down:      "#DC2626",
  upFill:    "#16A34A44",
  downFill:  "#DC262644",
  upLight:   "#16A34A22",
  downLight: "#DC262622",
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
    vertLine: { color: COLORS.text, labelBackgroundColor: "#1E293B" },
    horzLine: { color: COLORS.text, labelBackgroundColor: "#1E293B" },
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

export function PriceChart({
  candles,
  mode,
  simulated,
  height = 160,
  mini = false,
  ma,
  showRsi = false,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);

  const useCandlestick = mode === "Price" && !mini;

  // Height splits (only meaningful for the candlestick layout)
  const rsiPaneH    = showRsi && useCandlestick ? Math.round(height * 0.28) : 0;
  const volPaneH    = Math.round(height * (showRsi && useCandlestick ? 0.17 : 0.25));
  const candlePaneH = height - volPaneH - rsiPaneH;

  useEffect(() => {
    if (!containerRef.current || candles.length < 2) return;

    const el    = containerRef.current;
    const up    = candles[candles.length - 1].close >= candles[0].close;
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

    // ── Price mode — full candlestick + volume [+ RSI] panes ──────────────────
    const candleEl = el.querySelector<HTMLDivElement>(".chart-candle")!;
    const volEl    = el.querySelector<HTMLDivElement>(".chart-vol")!;
    const rsiEl    = showRsi ? el.querySelector<HTMLDivElement>(".chart-rsi") : null;

    const candleChart = createChart(candleEl, {
      ...BASE_OPTIONS,
      width:  el.clientWidth,
      height: candlePaneH,
      timeScale: { ...BASE_OPTIONS.timeScale, visible: false },
    });

    const volChart = createChart(volEl, {
      ...BASE_OPTIONS,
      width:  el.clientWidth,
      height: volPaneH,
      layout: { ...BASE_OPTIONS.layout, fontSize: 9 },
      grid:   { vertLines: { color: COLORS.grid }, horzLines: { color: "transparent" } },
      timeScale: { ...BASE_OPTIONS.timeScale, visible: !showRsi },
      crosshair: {
        vertLine: { color: COLORS.text, labelBackgroundColor: "#1E293B" },
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
      const closes    = candles.map((c) => c.close);
      const maOptions = [
        { period: 20,  enabled: ma.ma20,  color: "#2563EB" },
        { period: 50,  enabled: ma.ma50,  color: "#D97706" },
        { period: 200, enabled: ma.ma200, color: "#7C3AED" },
      ];
      for (const { period, enabled, color: maColor } of maOptions) {
        if (!enabled || candles.length < period) continue;
        const maSeries = candleChart.addSeries(LineSeries, {
          color: maColor,
          lineWidth: 1,
          priceLineVisible:       false,
          lastValueVisible:       false,
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

    // RSI pane
    let rsiChart: IChartApi | null = null;
    if (showRsi && rsiEl) {
      rsiChart = createChart(rsiEl, {
        ...BASE_OPTIONS,
        width:  el.clientWidth,
        height: rsiPaneH,
        layout: { ...BASE_OPTIONS.layout, fontSize: 9 },
        grid:   { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
        rightPriceScale: { ...BASE_OPTIONS.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
        crosshair: {
          vertLine: { color: COLORS.text, labelBackgroundColor: "#1E293B" },
          horzLine: { visible: false, labelVisible: false },
        },
      });

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color:      "#8B5CF6",
        lineWidth:  1,
        priceLineVisible:       false,
        lastValueVisible:       true,
        crosshairMarkerVisible: false,
      });

      const rsiValues = computeRSISeries(candles.map((c) => c.close));
      rsiSeries.setData(
        candles
          .map((c, i) =>
            rsiValues[i] !== null
              ? { time: c.time as UTCTimestamp, value: rsiValues[i] as number }
              : null
          )
          .filter((d): d is { time: UTCTimestamp; value: number } => d !== null)
      );

      rsiSeries.createPriceLine({ price: 70, color: "#EF4444", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true,  title: "" });
      rsiSeries.createPriceLine({ price: 50, color: "#94A3B8", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "" });
      rsiSeries.createPriceLine({ price: 30, color: "#22C55E", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true,  title: "" });
    }

    // Sync all time scales — guard flag prevents circular updates
    let syncing = false;
    const onCandleRangeChange: LogicalRangeChangeEventHandler = (range) => {
      if (syncing || !range) return;
      syncing = true;
      volChart.timeScale().setVisibleLogicalRange(range);
      rsiChart?.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };
    const onVolRangeChange: LogicalRangeChangeEventHandler = (range) => {
      if (syncing || !range) return;
      syncing = true;
      candleChart.timeScale().setVisibleLogicalRange(range);
      rsiChart?.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };
    const onRsiRangeChange: LogicalRangeChangeEventHandler = (range) => {
      if (syncing || !range) return;
      syncing = true;
      candleChart.timeScale().setVisibleLogicalRange(range);
      volChart.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };

    candleChart.timeScale().subscribeVisibleLogicalRangeChange(onCandleRangeChange);
    volChart.timeScale().subscribeVisibleLogicalRangeChange(onVolRangeChange);
    if (rsiChart) {
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange(onRsiRangeChange);
    }

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      candleChart.applyOptions({ width: w });
      volChart.applyOptions({ width: w });
      rsiChart?.applyOptions({ width: w });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      candleChart.timeScale().unsubscribeVisibleLogicalRangeChange(onCandleRangeChange);
      volChart.timeScale().unsubscribeVisibleLogicalRangeChange(onVolRangeChange);
      if (rsiChart) {
        rsiChart.timeScale().unsubscribeVisibleLogicalRangeChange(onRsiRangeChange);
        rsiChart.remove();
      }
      candleChart.remove();
      volChart.remove();
      chartRef.current = null;
    };
  }, [candles, mode, height, mini, ma, showRsi, candlePaneH, volPaneH, rsiPaneH]);

  return (
    <div className="relative border border-[#ccd5ae] bg-white overflow-hidden" style={{ height }}>
      {simulated && (
        <div className="absolute top-1 right-1 text-xs px-1.5 py-0.5 z-10 bg-rose-50 text-rose-600 rounded font-medium">
          simulated
        </div>
      )}
      {candles.length < 2 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 z-10">
          {candles.length === 0 ? "กำลังโหลด..." : "ไม่มีข้อมูลกราฟ"}
        </div>
      )}
      {useCandlestick ? (
        <div ref={containerRef} className="w-full h-full flex flex-col">
          <div className="chart-candle w-full" style={{ height: `${candlePaneH}px` }} />
          <div className="chart-vol   w-full" style={{ height: `${volPaneH}px` }} />
          {showRsi && <div className="chart-rsi w-full" style={{ height: `${rsiPaneH}px` }} />}
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
}

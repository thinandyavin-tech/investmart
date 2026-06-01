"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
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

function buildChart(el: HTMLDivElement, height: number): IChartApi {
  return createChart(el, {
    width:  el.clientWidth,
    height,
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
      borderColor:    COLORS.border,
      timeVisible:    true,
      minBarSpacing:  0.5, // prevents zooming out so far that bars disappear
      fixRightEdge:   false,
      fixLeftEdge:    false,
    },
    crosshair: {
      vertLine: { color: COLORS.text, labelBackgroundColor: COLORS.border },
      horzLine: { color: COLORS.text, labelBackgroundColor: COLORS.border },
    },
    handleScroll: {
      mouseWheel:        true,
      pressedMouseMove:  true,
      horzTouchDrag:     true,
      vertTouchDrag:     false,
    },
    handleScale: {
      mouseWheel:  true,
      pinch:       true,
      axisPressedMouseMove: { time: true, price: false },
    },
  });
}

export function PriceChart({ candles, mode, simulated, height = 160 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length < 2) return;

    const el    = containerRef.current;
    const up    = candles[candles.length - 1].close >= candles[0].close;
    const color = up ? COLORS.up : COLORS.down;

    if (mode === "Volume") {
      const chart = buildChart(el, height);
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

    if (mode === "Relative") {
      const chart = buildChart(el, height);
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

    // Price mode: candlestick + volume pane
    const volHeight  = Math.round(height * 0.25);
    const candleH    = height - volHeight;

    // Two stacked charts sharing the same time scale
    const candleEl   = el.querySelector<HTMLDivElement>(".chart-candle")!;
    const volEl      = el.querySelector<HTMLDivElement>(".chart-vol")!;

    const candleChart = createChart(candleEl, {
      width:  el.clientWidth,
      height: candleH,
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
        visible:       false, // hide time axis on candle chart, show on vol
      },
      crosshair: {
        vertLine: { color: COLORS.text, labelBackgroundColor: COLORS.border },
        horzLine: { color: COLORS.text, labelBackgroundColor: COLORS.border },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: false } },
    });

    const volChart = createChart(volEl, {
      width:  el.clientWidth,
      height: volHeight,
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor:  COLORS.text,
        fontSize:   9,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: "transparent" },
      },
      rightPriceScale: {
        borderColor:  COLORS.border,
        scaleMargins: { top: 0.1, bottom: 0 },
      },
      timeScale: {
        borderColor:   COLORS.border,
        timeVisible:   true,
        minBarSpacing: 0.5,
      },
      crosshair: {
        vertLine: { color: COLORS.text, labelBackgroundColor: COLORS.border },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: false } },
    });

    chartRef.current = candleChart;

    const candleSeries = candleChart.addSeries(CandlestickSeries, {
      upColor:        COLORS.up,
      downColor:      COLORS.down,
      borderUpColor:  COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor:    COLORS.up,
      wickDownColor:  COLORS.down,
      priceFormat:    { type: "price", precision: 2, minMove: 0.01 },
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
    // Sync time scales
    candleChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) volChart.timeScale().setVisibleLogicalRange(range);
    });
    volChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) candleChart.timeScale().setVisibleLogicalRange(range);
    });

    const ro = new ResizeObserver(() => {
      if (el) {
        const w = el.clientWidth;
        candleChart.applyOptions({ width: w });
        volChart.applyOptions({ width: w });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      candleChart.remove();
      volChart.remove();
      chartRef.current = null;
    };
  }, [candles, mode, height]);

  const isPriceMode = mode === "Price";

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
      {isPriceMode ? (
        <div ref={containerRef} className="w-full h-full flex flex-col">
          <div className="chart-candle w-full" style={{ height: `${Math.round(height * 0.75)}px` }} />
          <div className="chart-vol w-full" style={{ height: `${Math.round(height * 0.25)}px` }} />
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
}

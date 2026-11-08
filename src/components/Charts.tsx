import type { ReactElement } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { emptyCopy } from "../copy/sections";
import { formatLevel, formatPercent, formatRatio } from "../lib/format";
import type { Point } from "../types/tearsheet";

const tick = { fill: "#6e675f", fontSize: 11, fontFamily: "IBM Plex Mono, ui-monospace, monospace" };
const tooltipStyle = {
  background: "#f7f4ee",
  border: "1px solid #ddd4c6",
  borderRadius: 0,
  fontSize: 12,
  fontFamily: "IBM Plex Mono, ui-monospace, monospace",
};

export const palette = {
  strategy: "#1e3a34",
  benchmark: "#8a5a12",
  active: "#9d2c2c",
  residual: "#3f5e56",
  bar: "#1e3a34",
};

type NamedSeries = { name: string; points: Point[]; color: string; format?: (value: number) => string; axis?: "left" | "right" };

export function SeriesSummary({ name, points }: { name: string; points: Point[] }) {
  if (!points.length) return null;
  const last = points[points.length - 1];
  return (
    <p className="sr-only">
      {name} from {points[0].date} to {last.date}, last value {last.value}.
    </p>
  );
}

export function GrowthChart({ series, format = formatLevel }: { series: NamedSeries[]; format?: (value: number) => string }) {
  if (!series.some((item) => item.points.length)) return <Empty />;
  const data = rows(series);
  const left = series.find((item) => (item.axis ?? "left") === "left");
  const right = series.find((item) => item.axis === "right");
  return (
    <>
      {series.map((item) => (
        <SeriesSummary key={item.name} name={item.name} points={item.points} />
      ))}
      <Frame>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#ddd4c6" vertical={false} />
        <XAxis dataKey="date" tick={tick} minTickGap={28} />
        <YAxis yAxisId="left" tick={tick} width={56} tickFormatter={(value) => (left?.format ?? format)(Number(value))} />
        {right ? <YAxis yAxisId="right" orientation="right" tick={tick} width={48} tickFormatter={(value) => (right.format ?? format)(Number(value))} /> : null}
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => {
            const match = series.find((item) => item.name === name);
            return [(match?.format ?? format)(Number(value)), String(name)];
          }}
        />
        {series.map((item) => (
          <Line key={item.name} type="monotone" dataKey={item.name} stroke={item.color} strokeWidth={1.6} dot={false} isAnimationActive={false} yAxisId={item.axis ?? "left"} />
        ))}
      </LineChart>
      </Frame>
    </>
  );
}

export function DrawdownChart({ points }: { points: Point[] }) {
  if (!points.length) return <Empty />;
  const data = points.map((point) => ({ date: point.date, Drawdown: point.value }));
  return (
    <>
      <SeriesSummary name="Drawdown" points={points} />
      <Frame>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#ddd4c6" vertical={false} />
        <XAxis dataKey="date" tick={tick} minTickGap={28} />
        <YAxis tick={tick} width={56} tickFormatter={(value) => formatPercent(Number(value))} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatPercent(Number(value)), "Drawdown"]} />
        <Area type="monotone" dataKey="Drawdown" stroke={palette.active} fill={palette.active} fillOpacity={0.18} isAnimationActive={false} />
      </AreaChart>
      </Frame>
    </>
  );
}

export function HistogramChart({ bins, percent = true }: { bins: { x0: number; x1: number; count: number }[]; percent?: boolean }) {
  if (!bins.length) return <Empty />;
  const format = percent ? formatPercent : formatLevel;
  const data = bins.map((bin) => ({ label: format(bin.x0), count: bin.count, span: `${format(bin.x0)} to ${format(bin.x1)}` }));
  return (
    <Frame>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#ddd4c6" vertical={false} />
        <XAxis dataKey="label" tick={tick} minTickGap={20} />
        <YAxis tick={tick} width={36} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value, _name, item) => [String(value), String(item?.payload?.span ?? "Count")]} />
        <Bar dataKey="count" fill={palette.bar} isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

export function QQChart({ points }: { points: { theoretical: number; sample: number }[] }) {
  if (!points.length) return <Empty />;
  const data = points.map((point) => ({ theoretical: point.theoretical, sample: point.sample }));
  const values = data.flatMap((point) => [point.theoretical, point.sample]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  return (
    <>
      <p className="sr-only">Quantile plot with {points.length} points.</p>
      <Frame>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#ddd4c6" />
        <XAxis type="number" dataKey="theoretical" tick={tick} tickFormatter={(value) => formatPercent(Number(value))} name="Theoretical" />
        <YAxis type="number" dataKey="sample" tick={tick} width={56} tickFormatter={(value) => formatPercent(Number(value))} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatPercent(Number(value)), String(name)]} />
        <ReferenceLine segment={[{ x: low, y: low }, { x: high, y: high }]} stroke="#8a5a12" />
        <Scatter dataKey="sample" fill={palette.strategy} isAnimationActive={false} />
      </ComposedChart>
      </Frame>
    </>
  );
}

export function BarSeriesChart({ points, label }: { points: { name: string; value: number }[]; label: string }) {
  if (!points.length) return <Empty />;
  return (
    <Frame>
      <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
        <CartesianGrid stroke="#ddd4c6" vertical={false} />
        <XAxis dataKey="name" tick={tick} interval={0} angle={-25} height={48} textAnchor="end" />
        <YAxis tick={tick} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatRatio(Number(value)), label]} />
        <Bar dataKey="value" fill={palette.bar} isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

export function FitChart({
  x,
  y,
  intercept,
  slope,
}: {
  x: Point[];
  y: Point[];
  intercept: number;
  slope: number;
}) {
  const yByDate = new Map(y.map((point) => [point.date, point.value]));
  const data = x.flatMap((point) => {
    const sample = yByDate.get(point.date);
    if (sample == null) return [];
    return [{ x: point.value, y: sample, fit: intercept + slope * point.value }];
  });
  if (!data.length) return <Empty />;
  return (
    <>
      <p className="sr-only">
        Strategy against benchmark, slope {slope}, intercept {intercept}.
      </p>
      <Frame>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#ddd4c6" />
        <XAxis type="number" dataKey="x" tick={tick} tickFormatter={(value) => formatPercent(Number(value))} name="Benchmark" />
        <YAxis type="number" tick={tick} width={56} tickFormatter={(value) => formatPercent(Number(value))} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatPercent(Number(value)), String(name)]} />
        <Line type="linear" dataKey="fit" stroke={palette.benchmark} dot={false} strokeWidth={1.4} isAnimationActive={false} name="Fit" />
        <Scatter dataKey="y" fill={palette.strategy} name="Strategy" isAnimationActive={false} />
      </ComposedChart>
      </Frame>
    </>
  );
}

export function MonthHeatmap({
  monthly,
  annual,
}: {
  monthly: { year: number; month: number; value: number }[];
  annual: { year: number; value: number }[];
}) {
  if (!monthly.length && !annual.length) return <Empty />;
  const years = [...new Set([...monthly.map((item) => item.year), ...annual.map((item) => item.year)])].sort((a, b) => a - b);
  const maxAbs = Math.max(...monthly.map((item) => Math.abs(item.value)), 0);
  const byMonth = new Map(monthly.map((item) => [`${item.year}-${item.month}`, item.value]));
  const byYear = new Map(annual.map((item) => [item.year, item.value]));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left font-mono text-[11px]">
        <thead>
          <tr className="text-muted">
            <th className="px-2 py-1 font-medium" scope="col">Year</th>
            {months.map((month) => (
              <th key={month} className="px-2 py-1 font-medium" scope="col">{month}</th>
            ))}
            <th className="px-2 py-1 font-medium" scope="col">Year</th>
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year}>
              <th className="px-2 py-1 text-left font-medium text-muted" scope="row">{year}</th>
              {months.map((month, index) => {
                const value = byMonth.get(`${year}-${index + 1}`);
                return (
                  <td key={month} className="px-2 py-1 text-center tabular" style={heatStyle(value, maxAbs)}>
                    {value == null ? "" : formatPercent(value)}
                  </td>
                );
              })}
              <td className="px-2 py-1 text-center tabular">{byYear.has(year) ? formatPercent(byYear.get(year) ?? 0) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CorrelationTable({ names, matrix }: { names: string[]; matrix: number[][] }) {
  const valid = matrix.length === names.length && matrix.every((row) => row.length === names.length);
  if (!names.length || !valid) return <p className="font-mono text-xs text-pine">The correlation matrix does not match its labels.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr>
            <th className="px-2 py-1" scope="col" />
            {names.map((name) => (
              <th key={name} className="px-2 py-1 text-left font-medium text-muted" scope="col">{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {names.map((rowName, row) => (
            <tr key={rowName}>
              <th className="px-2 py-1 text-left font-medium text-muted" scope="row">{rowName}</th>
              {matrix[row].map((value, column) => (
                <td key={`${rowName}-${names[column]}`} className="px-2 py-1 tabular" style={heatStyle(value, 1)}>
                  {value.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ShareBar({ systematic, idiosyncratic }: { systematic: number; idiosyncratic: number }) {
  const total = Math.abs(systematic) + Math.abs(idiosyncratic) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden bg-line" aria-hidden="true">
        <div className="h-full bg-pine" style={{ width: `${(Math.abs(systematic) / total) * 100}%` }} />
        <div className="h-full bg-ochre" style={{ width: `${(Math.abs(idiosyncratic) / total) * 100}%` }} />
      </div>
      <p className="mt-2 font-mono text-xs text-muted">
        Systematic {formatPercent(systematic)} · Idiosyncratic {formatPercent(idiosyncratic)}
      </p>
    </div>
  );
}

function Frame({ children }: { children: ReactElement }) {
  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 280 }}>{children}</ResponsiveContainer>
    </div>
  );
}

function Empty() {
  return <p className="font-mono text-xs text-pine">{emptyCopy.noPoints}</p>;
}

function rows(series: NamedSeries[]) {
  const maps = series.map((item) => new Map(item.points.map((point) => [point.date, point.value])));
  const dates = [...new Set(series.flatMap((item) => item.points.map((point) => point.date)))].sort();
  return dates.map((date) => {
    const row: Record<string, string | number | null> = { date };
    series.forEach((item, index) => {
      row[item.name] = maps[index].get(date) ?? null;
    });
    return row;
  });
}

function heatStyle(value: number | undefined, maxAbs: number): { background: string; color: string } | undefined {
  if (value == null || maxAbs === 0) return undefined;
  const strength = Math.min(1, Math.abs(value) / maxAbs);
  const alpha = 0.12 + strength * 0.55;
  const ink = alpha > 0.5 ? "#f7f4ee" : "#1c1915";
  const color = value >= 0 ? `rgba(27, 107, 67, ${alpha})` : `rgba(157, 44, 44, ${alpha})`;
  return { background: color, color: ink };
}

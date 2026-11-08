import type { SlotEvaluation } from "./parseCsv";
import type { Alignment, AnalysisInput, Frequency, Point, SeriesKind, ValueScale } from "../types/tearsheet";
import { emptyCopy } from "../copy/sections";

export type FrequencyMode = "auto" | Frequency;

export type PanelStatus =
  | { kind: "empty" }
  | { kind: "incomplete" }
  | { kind: "needs-choice"; message: string }
  | { kind: "too-short"; message: string }
  | { kind: "ready" };

export type AssembledPanel = {
  input: AnalysisInput | null;
  status: PanelStatus;
  warnings: string[];
  survival: { kept: number; total: number } | null;
  span: { start: string; end: string } | null;
  detectedFrequency: Frequency | null;
  preview: { date: string; value: number; inRange: boolean }[];
  hasRiskFree: boolean;
};

type NamedSeries = { name: string; points: Point[]; scale: ValueScale };

export function assemblePanel(args: {
  strategy: SlotEvaluation | null;
  benchmark: SlotEvaluation | null;
  factors: SlotEvaluation | null;
  benchmarkFile: boolean;
  factorFile: boolean;
  seriesKind: SeriesKind | null;
  frequencyMode: FrequencyMode;
  alignment: Alignment;
  range: { start: string; end: string } | null;
}): AssembledPanel {
  const strategy = args.strategy?.blocking ? null : args.strategy?.value ?? null;
  if (!args.strategy || args.strategy.blocking || !strategy) {
    return emptyResult();
  }

  const benchmark = pickBenchmark(args);
  const riskFree = pickRiskFree(args);
  const factorSeries = args.factorFile && args.factors && !args.factors.blocking ? args.factors.factors : [];
  const warnings: string[] = [];
  if (args.benchmarkFile && benchmark.source === "file" && args.strategy?.benchmark) {
    warnings.push("Using the benchmark file.");
  }
  if (riskFree.note) warnings.push(riskFree.note);

  const groups = [benchmark.series, riskFree.series, ...factorSeries].filter((series): series is Point[] | NamedSeries => series != null);
  const keep = alignedDates(strategy.points, groups.map(pointsOf), args.alignment);
  const aligned = strategy.points.filter((point) => keep.has(point.date));
  const span = aligned.length ? { start: aligned[0].date, end: aligned[aligned.length - 1].date } : null;
  const active = args.range ?? span;
  const posted = active ? aligned.filter((point) => point.date >= active.start && point.date <= active.end) : [];
  const preview = strategy.points.slice(0, 100).map((point) => ({
    date: point.date,
    value: point.value,
    inRange: Boolean(active && keep.has(point.date) && point.date >= active.start && point.date <= active.end),
  }));
  const survival = { kept: keep.size, total: strategy.points.length };

  const base = {
    warnings,
    survival,
    span,
    detectedFrequency: detectFrequency(aligned.map((point) => point.date)),
    preview,
    hasRiskFree: false,
    input: null,
  };

  if (!span || aligned.length < 2) return { ...base, status: { kind: "too-short", message: emptyCopy.alignmentShort } };
  if (posted.length < 2) return { ...base, status: { kind: "too-short", message: emptyCopy.tooShort } };
  if (!args.seriesKind) {
    return { ...base, status: { kind: "needs-choice", message: "The strategy file is ready. Choose what the series contains to continue." } };
  }
  const frequency = args.frequencyMode === "auto" ? base.detectedFrequency : args.frequencyMode;
  if (!frequency) {
    return { ...base, status: { kind: "needs-choice", message: "The strategy file is ready. Choose a frequency to continue." } };
  }

  const postedDates = new Set(posted.map((point) => point.date));
  const benchmarkPoints = benchmark.series ? benchmark.series.filter((point) => postedDates.has(point.date)) : [];
  const riskPoints = riskFree.series ? riskFree.series.filter((point) => postedDates.has(point.date)) : [];
  const factors = factorSeries.flatMap((series) => {
    const points = series.points.filter((point) => postedDates.has(point.date));
    return points.length ? [{ name: series.name, points }] : [];
  });
  if (benchmark.series && !benchmarkPoints.length) warnings.push("The benchmark shares no dates with the strategy under this alignment.");
  if (factorSeries.length && !factors.length) warnings.push("The factors share no dates with the strategy under this alignment.");

  const factorScales = Object.fromEntries(
    factorSeries.filter((series) => factors.some((factor) => factor.name === series.name)).map((series) => [series.name, series.scale]),
  );

  return {
    ...base,
    warnings,
    hasRiskFree: riskPoints.length > 0,
    status: { kind: "ready" },
    input: {
      seriesKind: args.seriesKind,
      frequency,
      alignment: args.alignment,
      valueScale: {
        strategy: strategy.scale,
        benchmark: benchmarkPoints.length ? benchmark.scale : null,
        riskFree: riskPoints.length ? riskFree.scale : null,
        factors: factorScales,
      },
      strategy: posted,
      benchmark: benchmarkPoints.length ? benchmarkPoints : null,
      riskFree: riskPoints.length ? riskPoints : null,
      factors,
      range: { start: posted[0].date, end: posted[posted.length - 1].date },
    },
  };
}

function pickBenchmark(args: { benchmark: SlotEvaluation | null; benchmarkFile: boolean; strategy: SlotEvaluation | null }) {
  if (args.benchmarkFile) {
    if (args.benchmark && !args.benchmark.blocking && args.benchmark.value) {
      return { series: args.benchmark.value.points, scale: args.benchmark.value.scale, source: "file" as const };
    }
    return { series: null, scale: null, source: "file" as const };
  }
  if (args.strategy?.benchmark) return { series: args.strategy.benchmark.points, scale: args.strategy.benchmark.scale, source: "column" as const };
  return { series: null, scale: null, source: "none" as const };
}

function pickRiskFree(args: { strategy: SlotEvaluation | null; benchmark: SlotEvaluation | null; benchmarkFile: boolean }): {
  series: Point[] | null;
  scale: ValueScale | null;
  note: string | null;
} {
  const fromStrategy = args.strategy?.riskFree ?? null;
  const fromBenchmark = args.benchmarkFile && args.benchmark && !args.benchmark.blocking ? args.benchmark.riskFree : null;
  if (fromStrategy && fromBenchmark) {
    return { series: fromStrategy.points, scale: fromStrategy.scale, note: "Using the risk-free column on the strategy file." };
  }
  const chosen = fromStrategy ?? fromBenchmark;
  return chosen ? { series: chosen.points, scale: chosen.scale, note: null } : { series: null, scale: null, note: null };
}

function alignedDates(strategy: Point[], others: Point[][], alignment: Alignment): Set<string> {
  let keep = new Set(strategy.map((point) => point.date));
  if (alignment === "strategy-dates") return keep;
  for (const series of others) {
    const present = new Set(series.map((point) => point.date));
    keep = new Set([...keep].filter((date) => present.has(date)));
  }
  return keep;
}

function pointsOf(series: Point[] | NamedSeries): Point[] {
  return Array.isArray(series) ? series : series.points;
}

function detectFrequency(dates: string[]): Frequency | null {
  if (dates.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i += 1) {
    gaps.push((Date.parse(`${dates[i]}T00:00:00Z`) - Date.parse(`${dates[i - 1]}T00:00:00Z`)) / 86400000);
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianGap = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  if (medianGap >= 1 && medianGap <= 4) return "daily";
  if (medianGap >= 5 && medianGap <= 10) return "weekly";
  if (medianGap >= 25 && medianGap <= 35) return "monthly";
  if (medianGap >= 80 && medianGap <= 100) return "quarterly";
  return null;
}

function emptyResult(): AssembledPanel {
  return {
    input: null,
    status: { kind: "empty" },
    warnings: [],
    survival: null,
    span: null,
    detectedFrequency: null,
    preview: [],
    hasRiskFree: false,
  };
}

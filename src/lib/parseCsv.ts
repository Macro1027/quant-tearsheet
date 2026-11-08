import Papa from "papaparse";
import type { Frequency, Point, ValueScale } from "../types/tearsheet";

export type SlotId = "strategy" | "benchmark" | "factors";
export type DateOrder = "mdy" | "dmy";

export type ColumnMapping = {
  date: string | null;
  value: string | null;
  benchmark: string | null;
  riskFree: string | null;
  excluded: string[];
  dateOrder: DateOrder | null;
};

export type ParsedTable = {
  filename: string;
  headers: string[];
  rows: string[][];
};

export type SeriesBuild = {
  points: Point[];
  scale: ValueScale;
};

export type SlotEvaluation = {
  blocking: string | null;
  warnings: string[];
  ambiguousExample: string | null;
  summary: {
    rowCount: number;
    start: string | null;
    end: string | null;
    duplicateCount: number;
    missingCount: number;
    gapCount: number;
    valueScale: ValueScale | null;
  };
  value: SeriesBuild | null;
  benchmark: SeriesBuild | null;
  riskFree: SeriesBuild | null;
  factors: { name: string; points: Point[]; scale: ValueScale }[];
  frequency: Frequency | null;
  irregular: boolean;
};

const MAX_BYTES = 20 * 1024 * 1024;
const DATE_NAMES = ["date", "time", "timestamp", "datetime"];
const VALUE_NAMES = ["return", "returns", "ret", "pnl", "price", "close", "level", "nav", "equity"];
const BENCHMARK_NAMES = ["benchmark", "bench"];
const RISK_FREE_NAMES = ["rf", "riskfree", "tbill", "riskfreerate"];

export function emptyMapping(): ColumnMapping {
  return { date: null, value: null, benchmark: null, riskFree: null, excluded: [], dateOrder: null };
}

export function rejectUpload(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  const allowed = name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv");
  if (!allowed) return `${file.name} is not a CSV or text file.`;
  if (file.size > MAX_BYTES) return `${file.name} is larger than 20 MB.`;
  return null;
}

export function parseCsv(filename: string, text: string): { table: ParsedTable } | { error: string } {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) return { error: "The file has no rows." };
  const delimiter = detectDelimiter(clean);
  const result = Papa.parse<string[]>(clean, { delimiter, skipEmptyLines: "greedy" });
  const fatal = result.errors.find((error) => error.type === "Quotes" || error.code === "MissingQuotes" || error.code === "InvalidQuotes");
  if (fatal) {
    const row = fatal.row != null ? `Row ${fatal.row + 1}: ` : "";
    return { error: `${row}${fatal.message}` };
  }
  const grid = result.data.filter((row) => row.some((cell) => (cell ?? "").trim() !== ""));
  if (!grid.length) return { error: "The file has no rows." };
  const headers = uniqueHeaders(grid[0].map((cell) => cell ?? ""));
  const width = headers.length;
  const rows = grid.slice(1).map((row) => {
    const next = row.map((cell) => cell ?? "");
    while (next.length < width) next.push("");
    return next.slice(0, width);
  });
  if (!rows.length) return { error: "The file has a header and no data rows." };
  return { table: { filename, headers, rows } };
}

export function suggestMapping(slot: SlotId, table: ParsedTable): ColumnMapping {
  const taken = new Set<string>();
  const date = findHeader(table, DATE_NAMES, taken, "date");
  if (date) taken.add(date);
  if (slot === "factors") return { ...emptyMapping(), date };
  const value = findHeader(table, VALUE_NAMES, taken, "number");
  if (value) taken.add(value);
  const benchmark = slot === "strategy" ? findHeader(table, BENCHMARK_NAMES, taken, "number") : null;
  if (benchmark) taken.add(benchmark);
  const riskFree = findHeader(table, RISK_FREE_NAMES, taken, "number");
  return { ...emptyMapping(), date, value, benchmark, riskFree };
}

export function evaluateSlot(slot: SlotId, table: ParsedTable, mapping: ColumnMapping): SlotEvaluation {
  const blank = blankEvaluation(table.rows.length);
  const dateIndex = indexOf(table.headers, mapping.date);
  if (dateIndex < 0) return { ...blank, blocking: "Choose a date column." };

  const ambiguousExample = firstAmbiguous(table.rows, dateIndex);
  const base = { ...blank, ambiguousExample };
  if (ambiguousExample && !mapping.dateOrder) {
    return { ...base, blocking: `Choose month-first or day-first for ambiguous dates. Example: ${ambiguousExample}.` };
  }

  const parsedDates = table.rows.map((row) => parseDateCell(row[dateIndex] ?? "", mapping.dateOrder));
  const unreadable = parsedDates.filter((item) => item.status === "invalid").length;
  const warnings = unreadable ? [`${unreadable} dates could not be read.`] : [];
  const dated = parsedDates.flatMap((item) => (item.status === "ok" ? [item.date] : []));
  const duplicates = duplicateDates(dated);
  if (duplicates.length) {
    const shown = duplicates.slice(0, 10);
    const extra = duplicates.length > 10 ? `, and ${duplicates.length - 10} more` : "";
    return {
      ...base,
      warnings,
      summary: { ...base.summary, duplicateCount: duplicates.length },
      blocking: `Duplicate dates: ${shown.join(", ")}${extra}.`,
    };
  }

  if (slot === "factors") return evaluateFactors(table, mapping, parsedDates, warnings, ambiguousExample);

  const valueIndex = indexOf(table.headers, mapping.value);
  if (valueIndex < 0) return { ...base, warnings, blocking: "Choose a value column." };

  const value = buildSeries(table.rows, parsedDates, valueIndex);
  warnings.push(...seriesWarnings(value, "The value column"));
  const benchmarkIndex = slot === "strategy" ? indexOf(table.headers, mapping.benchmark) : -1;
  const riskIndex = indexOf(table.headers, mapping.riskFree);
  const benchmark = benchmarkIndex >= 0 ? buildSeries(table.rows, parsedDates, benchmarkIndex) : null;
  const riskFree = riskIndex >= 0 ? buildSeries(table.rows, parsedDates, riskIndex) : null;
  if (benchmark) warnings.push(...seriesWarnings(benchmark, "The benchmark column"));
  if (riskFree) warnings.push(...seriesWarnings(riskFree, "The risk-free column"));

  if (value.points.length < 2) {
    return { ...base, warnings, summary: summaryFor(table.rows.length, value, duplicates.length), blocking: "Fewer than two dated numeric rows." };
  }

  const spacing = describeSpacing(value.points);
  if (spacing.warning) warnings.push(spacing.warning);
  if (spacing.irregular) warnings.push("Spacing is irregular, so the frequency guess is weak.");
  return {
    blocking: null,
    warnings: [...new Set(warnings)],
    ambiguousExample,
    summary: summaryFor(table.rows.length, value, 0, spacing.gapCount),
    value: { points: value.points, scale: value.scale },
    benchmark: benchmark && benchmark.points.length ? { points: benchmark.points, scale: benchmark.scale } : null,
    riskFree: riskFree && riskFree.points.length ? { points: riskFree.points, scale: riskFree.scale } : null,
    factors: [],
    frequency: spacing.frequency,
    irregular: spacing.irregular,
  };
}

export function parseDateCell(
  raw: string,
  order: DateOrder | null,
): { status: "empty" } | { status: "ambiguous"; example: string } | { status: "invalid" } | { status: "ok"; date: string } {
  const text = raw.trim();
  if (!text) return { status: "empty" };
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(text);
  if (iso) return finishDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const ymd = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+.*)?$/.exec(text);
  if (ymd) return finishDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  const pair = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(text);
  if (!pair) return { status: "invalid" };
  const left = Number(pair[1]);
  const right = Number(pair[2]);
  const year = Number(pair[3]);
  if (left > 12 && right > 12) return { status: "invalid" };
  if (left > 12) return finishDate(year, right, left);
  if (right > 12) return finishDate(year, left, right);
  if (!order) return { status: "ambiguous", example: text };
  return order === "mdy" ? finishDate(year, left, right) : finishDate(year, right, left);
}

export function parseNumeric(raw: string): { status: "missing" } | { status: "invalid" } | { status: "ok"; value: number; percent: boolean } {
  let text = raw.trim();
  if (!text || /^(na|n\/a|null|nan)$/i.test(text)) return { status: "missing" };
  let percent = false;
  if (text.endsWith("%")) {
    percent = true;
    text = text.slice(0, -1).trim();
  }
  let negative = false;
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1).trim();
  }
  if (text.startsWith("+")) text = text.slice(1).trim();
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1).trim();
  }
  const body = normalizeNumeric(text);
  if (!body) return { status: "invalid" };
  const magnitude = Number(body);
  if (!Number.isFinite(magnitude)) return { status: "invalid" };
  return { status: "ok", value: negative ? -magnitude : magnitude, percent };
}

function evaluateFactors(
  table: ParsedTable,
  mapping: ColumnMapping,
  parsedDates: ReturnType<typeof parseDateCell>[],
  warnings: string[],
  ambiguousExample: string | null,
): SlotEvaluation {
  const blank = blankEvaluation(table.rows.length);
  const names = table.headers.filter((header) => header !== mapping.date && !mapping.excluded.includes(header));
  if (!names.length) return { ...blank, warnings, ambiguousExample, blocking: "Every factor column is excluded." };
  const builtFactors = names.map((name) => ({ name, built: buildSeries(table.rows, parsedDates, table.headers.indexOf(name)) }));
  for (const factor of builtFactors) warnings.push(...seriesWarnings(factor.built, factor.name));
  const factors = builtFactors.flatMap((factor) => {
    if (factor.built.points.length < 2) {
      warnings.push(`${factor.name} has fewer than two numeric rows and was left out.`);
      return [];
    }
    return [{ name: factor.name, points: factor.built.points, scale: factor.built.scale }];
  });
  if (!factors.length) {
    return { ...blank, warnings: [...new Set(warnings)], ambiguousExample, blocking: "Fewer than two dated numeric rows." };
  }
  const spacing = describeSpacing(factors[0].points);
  if (spacing.warning) warnings.push(spacing.warning);
  if (spacing.irregular) warnings.push("Spacing is irregular, so the frequency guess is weak.");
  const missing = builtFactors.reduce((sum, factor) => sum + factor.built.missing, 0);
  return {
    blocking: null,
    ambiguousExample,
    summary: {
      rowCount: table.rows.length,
      start: factors[0].points[0]?.date ?? null,
      end: factors[0].points[factors[0].points.length - 1]?.date ?? null,
      duplicateCount: 0,
      missingCount: missing,
      gapCount: spacing.gapCount,
      valueScale: factors[0].scale,
    },
    value: null,
    benchmark: null,
    riskFree: null,
    factors,
    frequency: spacing.frequency,
    irregular: spacing.irregular,
    warnings: [...new Set(warnings)],
  };
}

type Built = SeriesBuild & { missing: number; invalid: number; mixed: boolean; unsorted: boolean; suspicious: boolean };

function buildSeries(rows: string[][], parsedDates: ReturnType<typeof parseDateCell>[], valueIndex: number): Built {
  const draft: Point[] = [];
  let missing = 0;
  let invalid = 0;
  let sawPercent = false;
  let sawPlain = false;
  for (let i = 0; i < rows.length; i += 1) {
    const dated = parsedDates[i];
    if (!dated || dated.status !== "ok") continue;
    const numeric = parseNumeric(rows[i][valueIndex] ?? "");
    if (numeric.status === "missing") {
      missing += 1;
      continue;
    }
    if (numeric.status === "invalid") {
      invalid += 1;
      continue;
    }
    if (numeric.percent) sawPercent = true;
    else sawPlain = true;
    draft.push({ date: dated.date, value: numeric.value });
  }
  const unsorted = draft.some((point, index) => index > 0 && point.date < draft[index - 1].date);
  const points = [...draft].sort((a, b) => a.date.localeCompare(b.date));
  const magnitudes = points.map((point) => Math.abs(point.value)).sort((a, b) => a - b);
  const mid = magnitudes[Math.floor(magnitudes.length / 2)] ?? 0;
  return {
    points,
    scale: sawPercent ? "percent" : "decimal",
    missing,
    invalid,
    mixed: sawPercent && sawPlain,
    unsorted,
    suspicious: !sawPercent && mid > 1,
  };
}

function seriesWarnings(series: Built, label: string): string[] {
  const warnings: string[] = [];
  if (series.unsorted) warnings.push("Dates were out of order and have been sorted.");
  if (series.invalid) warnings.push(`${series.invalid} values in ${label} could not be read as numbers.`);
  if (series.mixed) warnings.push(`${label} mixes percent signs and plain numbers.`);
  if (series.scale === "percent") warnings.push(`${label} is quoted in percent.`);
  if (series.suspicious) warnings.push(`The typical absolute value in ${label} is above 1. The series may be in percent points or prices.`);
  return warnings;
}

function summaryFor(rowCount: number, series: Built, duplicateCount: number, gapCount = 0): SlotEvaluation["summary"] {
  return {
    rowCount,
    start: series.points[0]?.date ?? null,
    end: series.points[series.points.length - 1]?.date ?? null,
    duplicateCount,
    missingCount: series.missing,
    gapCount,
    valueScale: series.points.length ? series.scale : null,
  };
}

function describeSpacing(points: Point[]): { frequency: Frequency | null; irregular: boolean; gapCount: number; warning: string | null } {
  if (points.length < 2) return { frequency: null, irregular: false, gapCount: 0, warning: null };
  const gaps = points.slice(1).map((point, index) => ({ days: daysBetween(points[index].date, point.date), date: point.date }));
  const gapDays = gaps.map((gap) => gap.days).sort((a, b) => a - b);
  const medianGap = median(gapDays);
  const upperQuartile = gapDays[Math.min(gapDays.length - 1, Math.floor(gapDays.length * 0.75))];
  const large = gaps.filter((gap) => gap.days > medianGap * 3);
  const irregular = upperQuartile > medianGap * 4;
  const warning = large.length
    ? `${large.length} gaps are longer than three times the typical spacing. First: ${large.slice(0, 3).map((gap) => gap.date).join(", ")}.`
    : null;
  return { frequency: bandFrequency(medianGap), irregular, gapCount: large.length, warning };
}

function bandFrequency(medianGap: number): Frequency | null {
  if (medianGap >= 1 && medianGap <= 4) return "daily";
  if (medianGap >= 5 && medianGap <= 10) return "weekly";
  if (medianGap >= 25 && medianGap <= 35) return "monthly";
  if (medianGap >= 80 && medianGap <= 100) return "quarterly";
  return null;
}

function daysBetween(start: string, end: string): number {
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function firstAmbiguous(rows: string[][], dateIndex: number): string | null {
  for (const row of rows) {
    const parsed = parseDateCell(row[dateIndex] ?? "", null);
    if (parsed.status === "ambiguous") return parsed.example;
  }
  return null;
}

function duplicateDates(dates: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const date of dates) {
    if (seen.has(date)) duplicates.add(date);
    else seen.add(date);
  }
  return [...duplicates];
}

function blankEvaluation(rowCount: number): SlotEvaluation {
  return {
    blocking: null,
    warnings: [],
    ambiguousExample: null,
    summary: { rowCount, start: null, end: null, duplicateCount: 0, missingCount: 0, gapCount: 0, valueScale: null },
    value: null,
    benchmark: null,
    riskFree: null,
    factors: [],
    frequency: null,
    irregular: false,
  };
}

function findHeader(table: ParsedTable, candidates: string[], taken: Set<string>, kind: "date" | "number"): string | null {
  for (const candidate of candidates) {
    const match = table.headers.find((header, index) => {
      if (taken.has(header) || !headerMatches(header, candidate)) return false;
      return kind === "date" ? columnLooksLikeDate(table.rows, index) : columnLooksLikeNumber(table.rows, index);
    });
    if (match) return match;
  }
  return null;
}

function headerMatches(header: string, candidate: string): boolean {
  const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized === candidate || (candidate.length >= 4 && normalized.endsWith(candidate));
}

function columnLooksLikeDate(rows: string[][], index: number): boolean {
  let seen = 0;
  for (const row of rows) {
    const raw = row[index] ?? "";
    if (!raw.trim()) continue;
    seen += 1;
    const parsed = parseDateCell(raw, null);
    if (parsed.status === "ok" || parsed.status === "ambiguous") return true;
    if (seen >= 30) break;
  }
  return false;
}

function columnLooksLikeNumber(rows: string[][], index: number): boolean {
  let seen = 0;
  for (const row of rows) {
    const raw = row[index] ?? "";
    if (!raw.trim()) continue;
    seen += 1;
    if (parseNumeric(raw).status === "ok") return true;
    if (seen >= 30) break;
  }
  return false;
}

function indexOf(headers: string[], name: string | null): number {
  if (!name) return -1;
  return headers.indexOf(name);
}

function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((cell, index) => {
    const base = cell.trim() || `column_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function detectDelimiter(text: string): "," | ";" | "\t" {
  const sample = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 50).join("\n");
  let best: { delimiter: "," | ";" | "\t"; consistency: number; columns: number } = { delimiter: ",", consistency: -1, columns: -1 };
  for (const delimiter of [",", ";", "\t"] as const) {
    const parsed = Papa.parse<string[]>(sample, { delimiter, skipEmptyLines: "greedy" });
    const rows = parsed.data.filter((row) => row.some((cell) => (cell ?? "").trim() !== ""));
    if (!rows.length) continue;
    const tally = new Map<number, number>();
    for (const row of rows) tally.set(row.length, (tally.get(row.length) ?? 0) + 1);
    let columns = 0;
    let hits = 0;
    for (const [width, count] of tally) {
      if (count > hits || (count === hits && width > columns)) {
        hits = count;
        columns = width;
      }
    }
    const consistency = hits / rows.length;
    if (consistency > best.consistency + 1e-9 || (Math.abs(consistency - best.consistency) < 1e-9 && columns > best.columns)) {
      best = { delimiter, consistency, columns };
    }
  }
  return best.delimiter;
}

function finishDate(year: number, month: number, day: number): { status: "ok"; date: string } | { status: "invalid" } {
  if (month < 1 || month > 12 || day < 1 || day > 31) return { status: "invalid" };
  const stamp = new Date(Date.UTC(year, month - 1, day));
  if (stamp.getUTCFullYear() !== year || stamp.getUTCMonth() !== month - 1 || stamp.getUTCDate() !== day) return { status: "invalid" };
  return { status: "ok", date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

function normalizeNumeric(text: string): string | null {
  let body = text.replace(/\s+/g, "");
  if (!body) return null;
  const hasDot = body.includes(".");
  const hasComma = body.includes(",");
  if (hasDot && hasComma) {
    if (body.lastIndexOf(",") > body.lastIndexOf(".")) body = body.replace(/\./g, "").replace(",", ".");
    else body = body.replace(/,/g, "");
  } else if (hasComma) {
    const parts = body.split(",");
    const thousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
    if (thousands) {
      if (!parts.slice(1).every((part) => part.length === 3)) return null;
      body = parts.join("");
    } else body = `${parts[0]}.${parts[1]}`;
  }
  return /^(\d+)(\.\d+)?$/.test(body) ? body : null;
}

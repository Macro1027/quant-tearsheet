/** Display formatters. Computed metrics arrive as decimals: 0.12 renders as 12.00%. */

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatRatio(value: number): string {
  return value.toFixed(2);
}

export function formatLevel(value: number): string {
  return value.toFixed(2);
}

export function formatStat(value: number): string {
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.0001 || abs >= 10000)) return value.toExponential(2);
  return value.toFixed(4);
}

export function formatP(value: number): string {
  if (value < 0.001) return value.toExponential(2);
  return value.toFixed(3);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMetric(value: number | null, kind: "percent" | "ratio" | "stat"): string {
  if (value === null) return "Undefined";
  if (kind === "percent") return formatPercent(value);
  if (kind === "ratio") return formatRatio(value);
  return formatStat(value);
}

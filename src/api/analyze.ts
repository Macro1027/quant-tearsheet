import type { AnalysisInput, TearsheetModel } from "../types/tearsheet";

const SECTION_KEYS = ["overview", "performance", "regression", "benchmark", "risk", "factors"] as const;

export class AnalyzeError extends Error {
  tone: "down" | "failed";

  constructor(tone: "down" | "failed", message: string) {
    super(message);
    this.name = "AnalyzeError";
    this.tone = tone;
  }
}

export function readModel(payload: unknown): TearsheetModel {
  if (!isTearsheetModel(payload)) {
    throw new AnalyzeError("failed", "The analysis response was not a tearsheet model.");
  }
  if (hasNonFinite(payload)) {
    throw new AnalyzeError("failed", "The analysis response included a non-finite number.");
  }
  return payload;
}

export async function fetchHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch("/api/health", { signal });
    return response.ok;
  } catch {
    return false;
  }
}

export async function postAnalyze(input: AnalysisInput, signal?: AbortSignal): Promise<TearsheetModel> {
  let response: Response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new AnalyzeError("down", "Analysis service is not running");
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = messageOf(payload) ?? "Analysis failed";
    throw new AnalyzeError("failed", message);
  }
  return readModel(payload);
}

function isTearsheetModel(value: unknown): value is TearsheetModel {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return SECTION_KEYS.every((key) => key in record && (record[key] === null || isRecord(record[key])));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasNonFinite(value: unknown): boolean {
  if (typeof value === "number") return !Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasNonFinite);
  if (isRecord(value)) return Object.values(value).some(hasNonFinite);
  return false;
}

function messageOf(payload: unknown): string | null {
  if (!isRecord(payload) || typeof payload.message !== "string") return null;
  const text = payload.message.trim();
  return text || null;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

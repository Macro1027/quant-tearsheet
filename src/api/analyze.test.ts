import { describe, expect, it, vi } from "vitest";
import type { AnalysisInput } from "../types/tearsheet";
import { AnalyzeError, postAnalyze, readModel } from "./analyze";

const input: AnalysisInput = {
  seriesKind: "returns",
  frequency: "daily",
  alignment: "inner",
  valueScale: { strategy: "decimal", benchmark: null, riskFree: null, factors: {} },
  strategy: [
    { date: "2020-01-02", value: 0.01 },
    { date: "2020-01-03", value: -0.02 },
  ],
  benchmark: null,
  riskFree: null,
  factors: [],
  range: { start: "2020-01-02", end: "2020-01-03" },
};

const emptyModel = {
  overview: null,
  performance: null,
  regression: null,
  benchmark: null,
  risk: null,
  factors: null,
};

describe("analysis client", () => {
  it("rejects a non-finite model and a body that is not a tearsheet", () => {
    expect(() => readModel({ ...emptyModel, overview: { sharpe: Number.POSITIVE_INFINITY } })).toThrow(AnalyzeError);
    expect(() => readModel({ overview: null })).toThrow(/not a tearsheet model/);
  });

  it("reports a down service and an analysis failure message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("failed to fetch");
    }));
    await expect(postAnalyze(input)).rejects.toMatchObject({ tone: "down" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "zero variance" }), { status: 500 })));
    await expect(postAnalyze(input)).rejects.toMatchObject({ tone: "failed", message: "zero variance" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(emptyModel), { status: 200 })));
    await expect(postAnalyze(input)).resolves.toEqual(emptyModel);
    vi.unstubAllGlobals();
  });
});

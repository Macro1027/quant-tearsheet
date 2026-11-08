import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TearsheetModel } from "../types/tearsheet";
import { Tearsheet, type ReportMeta } from "./Tearsheet";

const meta: ReportMeta = {
  filename: "strategy.csv",
  seriesKind: "returns",
  frequency: "daily",
  alignment: "inner",
  hasRiskFree: false,
  benchmarkAttached: true,
  factorsAttached: true,
  benchmarkInRequest: true,
  factorsInRequest: true,
};

const point = (date: string, value: number) => ({ date, value });

const model: TearsheetModel = {
  overview: {
    start: "2020-01-02",
    end: "2020-03-02",
    observations: 40,
    totalGrowth: 0.5,
    annualizedReturn: 0.12,
    annualizedVolatility: 0.1,
    sharpe: 1.5,
    maxDrawdown: -0.2,
    calmar: 0.6,
  },
  performance: {
    cumulative: [point("2020-01-02", 1), point("2020-02-03", 1.2)],
    benchmarkCumulative: [point("2020-01-02", 1), point("2020-02-03", 1.1)],
    drawdown: [point("2020-02-03", -0.2)],
    monthlyReturns: [{ year: 2020, month: 1, value: 0.05 }],
    annualReturns: [{ year: 2020, value: 0.12 }],
    drawdownEpisodes: [{ start: "2020-01-15", trough: "2020-02-03", end: null, depth: -0.2, length: 12, recovery: null }],
    rolling: [{ window: 21, return: [point("2020-02-03", 0.08)], volatility: [point("2020-02-03", 0.1)], sharpe: [point("2020-02-03", 1.1)] }],
  },
  regression: {
    mean: 0.001,
    volatility: 0.01,
    skewness: -0.4,
    excessKurtosis: 1.2,
    observations: 40,
    histogram: [{ x0: -0.02, x1: 0, count: 10 }],
    qq: [{ theoretical: -0.01, sample: -0.02 }],
    autocorrelation: [{ lag: 1, value: 0.2 }],
    fit: { x: [point("2020-01-02", 0.01)], y: [point("2020-01-02", 0.02)], intercept: 0.001, slope: 0.8 },
    coefficients: [{ name: "Benchmark", estimate: 0.8, stdError: 0.1, tStat: 8, pValue: 0.0001 }],
    rSquared: 0.64,
    adjustedRSquared: 0.63,
    residualStdError: 0.008,
    residuals: [point("2020-01-02", 0.001)],
    residualHistogram: [{ x0: -0.01, x1: 0.01, count: 8 }],
    diagnostics: [{ name: "Durbin-Watson", value: 1.9, pValue: null }],
  },
  benchmark: {
    strategyCumulative: [point("2020-01-02", 1), point("2020-02-03", 1.2)],
    benchmarkCumulative: [point("2020-01-02", 1), point("2020-02-03", 1.1)],
    activeCumulative: [point("2020-01-02", 0), point("2020-02-03", 0.1)],
    annualizedActiveReturn: 0.04,
    trackingError: 0.05,
    informationRatio: 0.8,
    battingAverage: 0.55,
    upCapture: 1.1,
    downCapture: 0.9,
    rolling: [{ window: 63, beta: [point("2020-02-03", 0.7)], correlation: [point("2020-02-03", 0.4)] }],
  },
  risk: {
    annualizedVolatility: 0.1,
    downsideDeviation: 0.07,
    maxDrawdown: -0.2,
    averageDrawdown: -0.05,
    ulcerIndex: 0.04,
    byConfidence: [
      { confidence: 0.95, valueAtRisk: -0.02, expectedShortfall: -0.03 },
      { confidence: 0.99, valueAtRisk: -0.04, expectedShortfall: -0.05 },
    ],
    worstPeriods: [{ date: "2020-03-02", value: -0.04 }],
    observations: 40,
  },
  factors: {
    coefficients: [{ name: "Mkt-RF", estimate: 0.9, stdError: 0.05, tStat: 18, pValue: 0.001 }],
    rSquared: 0.7,
    residualVolatility: 0.04,
    annualizedResidualVolatility: 0.08,
    returnContribution: [{ name: "Mkt-RF", value: 0.03 }],
    riskShare: { systematic: 0.75, idiosyncratic: 0.25 },
    correlation: { names: ["Strategy", "Mkt-RF"], matrix: [[1, 0.8], [0.8, 1]] },
  },
};

describe("Tearsheet", () => {
  it("renders each section from a model and leaves no placeholder zero", () => {
    render(<Tearsheet model={model} meta={meta} banner={null} loading={false} resetKey="1" />);
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Distribution and regression" })).toBeInTheDocument();
    expect(screen.getByText("1.50")).toBeInTheDocument();
    expect(screen.getByText("50.00%")).toBeInTheDocument();
    expect(screen.getAllByText("Benchmark").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mkt-RF").length).toBeGreaterThan(0);
    expect(screen.getByText("Durbin-Watson 1.9000")).toBeInTheDocument();
    expect(screen.getByText(/The analysis chose the risk-free treatment/)).toBeInTheDocument();
    expect(screen.queryByText("Not computed yet.")).not.toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it("keeps empty sections visible when the model is still null", () => {
    render(
      <Tearsheet
        model={{ overview: null, performance: null, regression: null, benchmark: null, risk: null, factors: null }}
        meta={{ ...meta, benchmarkAttached: false, factorsAttached: false, benchmarkInRequest: false, factorsInRequest: false, hasRiskFree: false }}
        banner={{ tone: "failed", message: "zero variance" }}
        loading={false}
        resetKey="2"
      />,
    );
    expect(screen.getAllByText("Not computed yet.").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("Add a benchmark to see relative performance.")).toBeInTheDocument();
    expect(screen.getByText("Add a factor file to see exposures and risk decomposition.")).toBeInTheDocument();
    expect(screen.getByText("Analysis failed")).toBeInTheDocument();
    expect(screen.getByText("zero variance")).toBeInTheDocument();
  });
});

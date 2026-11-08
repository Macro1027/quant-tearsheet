export type SeriesKind = "returns" | "price" | "excess";
export type Frequency = "daily" | "weekly" | "monthly" | "quarterly";
export type Alignment = "inner" | "strategy-dates";
export type ValueScale = "decimal" | "percent";

export type Point = { date: string; value: number };

export type AnalysisInput = {
  seriesKind: SeriesKind;
  frequency: Frequency;
  alignment: Alignment;
  valueScale: {
    strategy: ValueScale;
    benchmark: ValueScale | null;
    riskFree: ValueScale | null;
    factors: Record<string, ValueScale>;
  };
  strategy: Point[];
  benchmark: Point[] | null;
  riskFree: Point[] | null;
  factors: { name: string; points: Point[] }[];
  range: { start: string; end: string };
};

export type OverviewModel = {
  start: string;
  end: string;
  observations: number;
  totalGrowth: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpe: number | null;
  maxDrawdown: number;
  calmar: number | null;
};

export type PerformanceModel = {
  cumulative: Point[];
  benchmarkCumulative: Point[] | null;
  drawdown: Point[];
  monthlyReturns: { year: number; month: number; value: number }[];
  annualReturns: { year: number; value: number }[];
  drawdownEpisodes: {
    start: string;
    trough: string;
    end: string | null;
    depth: number;
    length: number;
    recovery: number | null;
  }[];
  rolling: {
    window: number;
    return: Point[] | null;
    volatility: Point[] | null;
    sharpe: Point[] | null;
  }[];
};

export type RegressionModel = {
  mean: number;
  volatility: number;
  skewness: number;
  excessKurtosis: number;
  observations: number;
  histogram: { x0: number; x1: number; count: number }[];
  qq: { theoretical: number; sample: number }[];
  autocorrelation: { lag: number; value: number }[];
  fit: {
    x: Point[];
    y: Point[];
    intercept: number;
    slope: number;
  } | null;
  coefficients: {
    name: string;
    estimate: number;
    stdError: number;
    tStat: number;
    pValue: number;
  }[];
  rSquared: number | null;
  adjustedRSquared: number | null;
  residualStdError: number | null;
  residuals: Point[] | null;
  residualHistogram: { x0: number; x1: number; count: number }[] | null;
  diagnostics: { name: string; value: number; pValue: number | null }[];
};

export type BenchmarkModel = {
  strategyCumulative: Point[];
  benchmarkCumulative: Point[];
  activeCumulative: Point[];
  annualizedActiveReturn: number;
  trackingError: number;
  informationRatio: number | null;
  battingAverage: number;
  upCapture: number | null;
  downCapture: number | null;
  rolling: {
    window: number;
    beta: Point[] | null;
    correlation: Point[] | null;
  }[];
};

export type RiskModel = {
  annualizedVolatility: number;
  downsideDeviation: number | null;
  maxDrawdown: number;
  averageDrawdown: number | null;
  ulcerIndex: number | null;
  byConfidence: {
    confidence: 0.95 | 0.99;
    valueAtRisk: number;
    expectedShortfall: number;
  }[];
  worstPeriods: { date: string; value: number }[];
  observations: number;
};

export type FactorModel = {
  coefficients: {
    name: string;
    estimate: number;
    stdError: number;
    tStat: number;
    pValue: number;
  }[];
  rSquared: number;
  residualVolatility: number;
  annualizedResidualVolatility: number | null;
  returnContribution: { name: string; value: number }[];
  riskShare: { systematic: number; idiosyncratic: number };
  correlation: { names: string[]; matrix: number[][] };
};

export type TearsheetModel = {
  overview: OverviewModel | null;
  performance: PerformanceModel | null;
  regression: RegressionModel | null;
  benchmark: BenchmarkModel | null;
  risk: RiskModel | null;
  factors: FactorModel | null;
};

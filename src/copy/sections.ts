export type SectionId = "overview" | "performance" | "regression" | "benchmark" | "risk" | "factors";

export type SectionCopy = {
  id: SectionId;
  index: string;
  title: string;
  explanation: string;
};

export const sections: SectionCopy[] = [
  {
    id: "overview",
    index: "01",
    title: "Overview",
    explanation:
      "These tiles frame the whole record: how much a unit grew, how widely the path moved, and how those two sit together. The sections below take the same span apart.",
  },
  {
    id: "performance",
    index: "02",
    title: "Performance",
    explanation:
      "This is the path itself. Cumulative growth shows where the series finished, the calendar table shows which periods carried it, and the drawdown chart shows how deep the losses were along the way.",
  },
  {
    id: "regression",
    index: "03",
    title: "Distribution and regression",
    explanation:
      "Period results have a center, a spread, and tails. The regression asks how much of that shape is a straight line against the benchmark, and what remains in the residuals.",
  },
  {
    id: "benchmark",
    index: "04",
    title: "Benchmark",
    explanation:
      "Relative performance asks where this series pulled ahead of the reference and where it gave the lead back. Capture splits that question into periods when the reference itself was rising and when it was falling.",
  },
  {
    id: "risk",
    index: "05",
    title: "Risk",
    explanation:
      "Risk here is about the size of losses. A typical down period, the deepest stretch, and the far left tail are three different ways the same record can hurt.",
  },
  {
    id: "factors",
    index: "06",
    title: "Factor model",
    explanation:
      "A factor model asks how much of the series lines up with the columns in the factor file, how much return and risk those columns account for, and what is left over once they are taken out.",
  },
];

export const gloss = {
  totalGrowth: "Growth of a unit over the full span.",
  annualizedReturn: "The per-year rate implied by that growth.",
  annualizedVolatility: "How widely period results spread, scaled to a year.",
  sharpe: "Return in excess of the risk-free series, per unit of volatility.",
  sharpeChosen: "Return in excess of the risk-free series, per unit of volatility. The analysis chose the risk-free treatment.",
  maxDrawdown: "The deepest peak-to-trough loss on the path.",
  calmar: "Annualized return relative to the depth of that worst loss.",
  mean: "The average period result.",
  volatility: "The spread of period results.",
  skewness: "Whether the tails lean toward gains or losses.",
  excessKurtosis: "How heavy the tails are compared with a bell curve.",
  activeReturn: "How much the series outpaced the benchmark, as an annualized rate.",
  trackingError: "How widely the gap versus the benchmark moves, scaled to a year.",
  informationRatio: "Active return per unit of tracking error.",
  batting: "The share of periods that finished ahead of the benchmark.",
  upCapture: "How much of the benchmark’s rising periods this series kept.",
  downCapture: "How much of the benchmark’s falling periods this series took.",
  downside: "The spread of the losing periods only.",
  averageDrawdown: "The typical depth of the underwater stretches.",
  ulcer: "A drawdown measure that spends more of its weight on deeper and longer losses.",
  valueAtRisk: "A loss threshold for the chosen confidence.",
  expectedShortfall: "The average loss in the periods beyond that threshold.",
  rSquared: "The share of variation lined up with the fitted terms.",
  residualVol: "The spread that remains after the fit.",
  annualResidual: "That leftover spread, scaled to a year.",
};

export const emptyCopy = {
  pending: "Not computed yet.",
  benchmark: "Add a benchmark to see relative performance.",
  factors: "Add a factor file to see exposures and risk decomposition.",
  noPoints: "No points in range.",
  tooShort: "The date range leaves fewer than two points, so there is nothing to analyze.",
  alignmentShort: "Alignment leaves fewer than two strategy dates.",
};

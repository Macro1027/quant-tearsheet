"""JSON contract for the local analysis service. Field names are camelCase on the wire."""

import math
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

SeriesKind = Literal["returns", "price", "excess"]
Frequency = Literal["daily", "weekly", "monthly", "quarterly"]
Alignment = Literal["inner", "strategy-dates"]
ValueScale = Literal["decimal", "percent"]


class Point(BaseModel):
    date: str
    value: float

    @field_validator("date")
    @classmethod
    def iso_date(cls, value: str) -> str:
        date.fromisoformat(value)
        if len(value) != 10:
            raise ValueError("date must be YYYY-MM-DD")
        return value

    @field_validator("value")
    @classmethod
    def finite(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("value must be finite")
        return value


class ValueScaleMap(BaseModel):
    strategy: ValueScale
    benchmark: ValueScale | None
    riskFree: ValueScale | None
    factors: dict[str, ValueScale]


class DateRange(BaseModel):
    start: str
    end: str

    @field_validator("start", "end")
    @classmethod
    def iso_date(cls, value: str) -> str:
        date.fromisoformat(value)
        if len(value) != 10:
            raise ValueError("date must be YYYY-MM-DD")
        return value


class FactorSeries(BaseModel):
    name: str
    points: list[Point]


class AnalysisInput(BaseModel):
    seriesKind: SeriesKind
    frequency: Frequency
    alignment: Alignment
    valueScale: ValueScaleMap
    strategy: list[Point]
    benchmark: list[Point] | None
    riskFree: list[Point] | None
    factors: list[FactorSeries]
    range: DateRange


class OverviewModel(BaseModel):
    start: str
    end: str
    observations: int
    totalGrowth: float
    annualizedReturn: float
    annualizedVolatility: float
    sharpe: float | None
    maxDrawdown: float
    calmar: float | None


class DrawdownEpisode(BaseModel):
    start: str
    trough: str
    end: str | None
    depth: float
    length: int
    recovery: int | None


class PerformanceRolling(BaseModel):
    window: int
    return_: list[Point] | None = Field(alias="return")
    volatility: list[Point] | None
    sharpe: list[Point] | None

    model_config = {"populate_by_name": True}


class MonthReturn(BaseModel):
    year: int
    month: int
    value: float


class YearReturn(BaseModel):
    year: int
    value: float


class PerformanceModel(BaseModel):
    cumulative: list[Point]
    benchmarkCumulative: list[Point] | None
    drawdown: list[Point]
    monthlyReturns: list[MonthReturn]
    annualReturns: list[YearReturn]
    drawdownEpisodes: list[DrawdownEpisode]
    rolling: list[PerformanceRolling]


class HistogramBin(BaseModel):
    x0: float
    x1: float
    count: int


class QQPoint(BaseModel):
    theoretical: float
    sample: float


class Autocorrelation(BaseModel):
    lag: int
    value: float


class FitModel(BaseModel):
    x: list[Point]
    y: list[Point]
    intercept: float
    slope: float


class Coefficient(BaseModel):
    name: str
    estimate: float
    stdError: float
    tStat: float
    pValue: float


class Diagnostic(BaseModel):
    name: str
    value: float
    pValue: float | None


class RegressionModel(BaseModel):
    mean: float
    volatility: float
    skewness: float
    excessKurtosis: float
    observations: int
    histogram: list[HistogramBin]
    qq: list[QQPoint]
    autocorrelation: list[Autocorrelation]
    fit: FitModel | None
    coefficients: list[Coefficient]
    rSquared: float | None
    adjustedRSquared: float | None
    residualStdError: float | None
    residuals: list[Point] | None
    residualHistogram: list[HistogramBin] | None
    diagnostics: list[Diagnostic]


class BenchmarkRolling(BaseModel):
    window: int
    beta: list[Point] | None
    correlation: list[Point] | None


class BenchmarkModel(BaseModel):
    strategyCumulative: list[Point]
    benchmarkCumulative: list[Point]
    activeCumulative: list[Point]
    annualizedActiveReturn: float
    trackingError: float
    informationRatio: float | None
    battingAverage: float
    upCapture: float | None
    downCapture: float | None
    rolling: list[BenchmarkRolling]


class ConfidenceSlice(BaseModel):
    confidence: float
    valueAtRisk: float
    expectedShortfall: float

    @field_validator("confidence")
    @classmethod
    def known_level(cls, value: float) -> float:
        if math.isclose(value, 0.95):
            return 0.95
        if math.isclose(value, 0.99):
            return 0.99
        raise ValueError("confidence must be 0.95 or 0.99")


class WorstPeriod(BaseModel):
    date: str
    value: float


class RiskModel(BaseModel):
    annualizedVolatility: float
    downsideDeviation: float | None
    maxDrawdown: float
    averageDrawdown: float | None
    ulcerIndex: float | None
    byConfidence: list[ConfidenceSlice]
    worstPeriods: list[WorstPeriod]
    observations: int


class NamedValue(BaseModel):
    name: str
    value: float


class RiskShare(BaseModel):
    systematic: float
    idiosyncratic: float


class CorrelationMatrix(BaseModel):
    names: list[str]
    matrix: list[list[float]]


class FactorModel(BaseModel):
    coefficients: list[Coefficient]
    rSquared: float
    residualVolatility: float
    annualizedResidualVolatility: float | None
    returnContribution: list[NamedValue]
    riskShare: RiskShare
    correlation: CorrelationMatrix


class TearsheetModel(BaseModel):
    overview: OverviewModel | None = None
    performance: PerformanceModel | None = None
    regression: RegressionModel | None = None
    benchmark: BenchmarkModel | None = None
    risk: RiskModel | None = None
    factors: FactorModel | None = None

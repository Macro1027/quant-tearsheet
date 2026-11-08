"""Panel points to dated series. Unit conversion only: percent to decimal, not price to return."""

from dataclasses import dataclass

import pandas as pd

from api.schemas import AnalysisInput, Frequency, Point, SeriesKind, ValueScale


@dataclass(frozen=True)
class Prepared:
    """Series on a DatetimeIndex, in decimal units of the file's own kind.

    A price is still a price. Convert with to_period_returns before a statistic
    that assumes a simple return.
    """

    kind: SeriesKind
    frequency: Frequency
    periods_per_year: float
    strategy: pd.Series
    benchmark: pd.Series | None
    risk_free: pd.Series | None
    factors: pd.DataFrame | None


def as_series(points: list[Point], scale: ValueScale) -> pd.Series:
    """Values indexed by date. Divide by 100 when the file quoted percent."""
    dates = [p.date for p in points]
    vals = [p.value for p in points]
    
    series = pd.Series(vals, index=dates)
    if scale == 'percent':
        series /= 100
    
    return series


def to_points(series: pd.Series) -> list[Point]:
    """Date-ordered chart points, with missing values dropped."""
    series = series.dropna().sort_index()
    dates = series.index
    points = []
    for stamp, value in series.items():
        points.append(Point(date=pd.Timestamp(stamp).strftime("%Y-%m-%d"), value=float(value)))

    return points 

def periods_per_year(frequency: Frequency) -> float:
    """How many of these periods make one year."""
    match frequency:
        case 'daily':
            return 252
        case 'weekly':
            return 52
        case 'monthly':
            return 12
        case 'quarterly':
            return 4


def prepare(panel: AnalysisInput) -> Prepared:
    """Strategy, benchmark, risk-free, and factor columns from the panel."""
    def dated(points: list[Point], scale: ValueScale) -> pd.Series:
            series = as_series(points, scale)
            series.index = pd.to_datetime(series.index)
            return series
    columns = {
        factor.name: dated(factor.points, panel.valueScale.factors[factor.name])
        for factor in panel.factors
    }

    return Prepared (
        kind = panel.seriesKind,
        frequency = panel.frequency,
        periods_per_year = periods_per_year(panel.frequency),
        strategy=dated(panel.strategy, panel.valueScale.strategy),
        benchmark=None if panel.benchmark is None else dated(panel.benchmark, panel.valueScale.benchmark),
        risk_free=None if panel.riskFree is None else dated(panel.riskFree, panel.valueScale.riskFree),
        factors = pd.DataFrame(columns) if columns else None
    )

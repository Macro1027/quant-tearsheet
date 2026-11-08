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
    df = pd.Series(points)


def to_points(series: pd.Series) -> list[Point]:
    """Date-ordered chart points, with missing values dropped."""
    raise NotImplementedError


def periods_per_year(frequency: Frequency) -> float:
    """How many of these periods make one year."""
    raise NotImplementedError


def prepare(panel: AnalysisInput) -> Prepared:
    """Strategy, benchmark, risk-free, and factor columns from the panel."""
    raise NotImplementedError

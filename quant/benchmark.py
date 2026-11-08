"""Strategy against the reference: active return, capture, and rolling beta and correlation."""

import pandas as pd

from api.schemas import AnalysisInput, BenchmarkModel

ROLLING_WINDOWS: tuple[int, ...] = (21, 63, 126, 252)


def active_returns(strategy: pd.Series, benchmark: pd.Series) -> pd.Series:
    """Period return of the strategy minus the period return of the benchmark."""
    raise NotImplementedError


def tracking_error(active: pd.Series, periods_per_year: float) -> float:
    """Spread of active returns, scaled to a year."""
    raise NotImplementedError


def information_ratio(active: pd.Series, periods_per_year: float) -> float | None:
    """Annualized active return per unit of tracking error. None when tracking error is zero."""
    raise NotImplementedError


def batting_average(strategy: pd.Series, benchmark: pd.Series) -> float:
    """Share of periods in which the strategy finished ahead of the benchmark."""
    raise NotImplementedError


def up_capture(strategy: pd.Series, benchmark: pd.Series) -> float | None:
    """How much of the benchmark's rising periods the strategy kept. None when the benchmark never rose."""
    raise NotImplementedError


def down_capture(strategy: pd.Series, benchmark: pd.Series) -> float | None:
    """How much of the benchmark's falling periods the strategy took. None when the benchmark never fell."""
    raise NotImplementedError


def rolling_beta(strategy: pd.Series, benchmark: pd.Series, window: int) -> pd.Series:
    """Beta of strategy on benchmark over each trailing window, indexed by the window's last date."""
    raise NotImplementedError


def rolling_correlation(strategy: pd.Series, benchmark: pd.Series, window: int) -> pd.Series:
    """Correlation of strategy and benchmark over each trailing window, indexed by the window's last date."""
    raise NotImplementedError


def build_benchmark(panel: AnalysisInput) -> BenchmarkModel | None:
    """Benchmark section. None when the panel has no benchmark, and None until implemented."""
    return None

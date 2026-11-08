"""Path, calendar returns, drawdown episodes, and rolling return, volatility, and Sharpe."""

import pandas as pd

from api.schemas import AnalysisInput, MonthReturn, PerformanceModel, YearReturn

ROLLING_WINDOWS: tuple[int, ...] = (21, 63, 126, 252)


def monthly_returns(returns: pd.Series) -> list[MonthReturn]:
    """One return for each calendar month that contains observations."""
    raise NotImplementedError


def annual_returns(returns: pd.Series) -> list[YearReturn]:
    """One return for each calendar year that contains observations."""
    raise NotImplementedError


def rolling_return(returns: pd.Series, window: int, periods_per_year: float) -> pd.Series:
    """Annualized return over each trailing window, indexed by the window's last date."""
    raise NotImplementedError


def rolling_volatility(returns: pd.Series, window: int, periods_per_year: float) -> pd.Series:
    """Annualized volatility over each trailing window, indexed by the window's last date."""
    raise NotImplementedError


def rolling_sharpe(excess: pd.Series, window: int, periods_per_year: float) -> pd.Series:
    """Sharpe over each trailing window, indexed by the window's last date."""
    raise NotImplementedError


def build_performance(panel: AnalysisInput) -> PerformanceModel | None:
    """Performance section, including one rolling entry per window in ROLLING_WINDOWS. None until implemented."""
    return None

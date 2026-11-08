"""Return, growth, and the ratios defined from them."""

import pandas as pd

from api.schemas import SeriesKind


def to_period_returns(values: pd.Series, kind: SeriesKind) -> pd.Series:
    """Simple period returns. A price or level becomes the change from the previous point."""
    match kind:
        case 'price':
            return values.pct_change().dropna()
        case _:
            return values 


def excess_returns(returns: pd.Series, risk_free: pd.Series | None) -> pd.Series:
    """Return minus the risk-free series. The strategy return itself when no risk-free series was supplied."""
    if not risk_free:
        return returns 
    return returns - risk_free 


def growth_of_unit(returns: pd.Series) -> pd.Series:
    """Path of a unit compounded through the period returns."""
    raise NotImplementedError


def total_growth(growth: pd.Series) -> float:
    """Growth of a unit over the whole path, as a total return."""
    raise NotImplementedError


def annualized_return(returns: pd.Series, periods_per_year: float) -> float:
    """Per-year rate implied by the compounded path."""
    raise NotImplementedError


def annualized_volatility(returns: pd.Series, periods_per_year: float) -> float:
    """Spread of period returns, scaled to a year."""
    raise NotImplementedError


def sharpe(excess: pd.Series, periods_per_year: float) -> float | None:
    """Excess return per unit of volatility, scaled to a year. None when volatility is zero."""
    raise NotImplementedError


def period_mean(returns: pd.Series) -> float:
    """Average period return."""
    raise NotImplementedError


def period_volatility(returns: pd.Series) -> float:
    """Spread of period returns, in the series' own frequency."""
    raise NotImplementedError


def skewness(returns: pd.Series) -> float:
    """Whether the tails lean toward gains or losses."""
    raise NotImplementedError


def excess_kurtosis(returns: pd.Series) -> float:
    """How heavy the tails are compared with a bell curve."""
    raise NotImplementedError

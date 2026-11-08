"""Return, growth, and the ratios defined from them."""

import pandas as pd

from api.schemas import SeriesKind


def to_period_returns(values: pd.Series, kind: SeriesKind) -> pd.Series:
    """Simple period returns. A price or level becomes the change from the previous point."""
    match kind:
        case 'price':
            series = values.pct_change().dropna()
            return pd.Series(series.to_numpy(), index=values.index[:-1])
        case _:
            return values 


def excess_returns(returns: pd.Series, risk_free: pd.Series | None) -> pd.Series:
    """Return minus the risk-free series. The strategy return itself when no risk-free series was supplied."""
    if risk_free is None:
        return returns 
    return returns - risk_free 


def growth_of_unit(returns: pd.Series) -> pd.Series:
    """Path of a unit compounded through the period returns."""
    return (1+returns).cumprod()


def total_growth(growth: pd.Series) -> float:
    """Growth of a unit over the whole path, as a total return."""
    return growth.iloc[-1] - 1


def annualized_return(returns: pd.Series, periods_per_year: float) -> float:
    """Per-year rate implied by the compounded path."""
    n = len(returns)
    return growth_of_unit(returns).iloc[-1] ** (periods_per_year / n) - 1


def annualized_volatility(returns: pd.Series, periods_per_year: float) -> float:
    """Spread of period returns, scaled to a year."""
    vol = returns.std()
    return periods_per_year ** 0.5 * vol


def sharpe(excess: pd.Series, periods_per_year: float) -> float | None:
    """Excess return per unit of volatility, scaled to a year. None when volatility is zero."""
    vol = annualized_volatility(excess, periods_per_year)
    if vol == 0:
        return None
    
    return (excess.mean() * periods_per_year) / vol


def period_mean(returns: pd.Series) -> float:
    """Average period return."""
    return returns.sum() / len(returns)


def period_volatility(returns: pd.Series) -> float:
    """Spread of period returns, in the series' own frequency."""
    return returns.std()


def skewness(returns: pd.Series) -> float:
    """Whether the tails lean toward gains or losses."""
    n = len(returns)
    return n /((n-1)*(n-2)) * sum(((returns - returns.mean()) / returns.std()) ** 3)


def excess_kurtosis(returns: pd.Series) -> float:
    """How heavy the tails are compared with a bell curve."""
    n = len(returns)
    adjustment = n * (n+1) / ((n-1) * (n-2) * (n-3))
    norm_baseline = 3 * (n-1) ** 2 / ((n-2) * (n-3))
    z_score = (returns - returns.mean()) / returns.std()
    return adjustment * sum(z_score ** 4) - norm_baseline



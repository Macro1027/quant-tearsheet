"""Path, calendar returns, drawdown episodes, and rolling return, volatility, and Sharpe."""

import pandas as pd

from api.schemas import AnalysisInput, MonthReturn, PerformanceModel, PerformanceRolling, YearReturn
from quant import benchmark
from quant.returns import *
from quant.series import prepare, to_points
from quant.drawdown import *

ROLLING_WINDOWS: tuple[int, ...] = (21, 63, 126, 252)


def monthly_returns(returns: pd.Series) -> list[MonthReturn]:
    """One return for each calendar month that contains observations."""
    mth_returns = returns.groupby([returns.index.year, returns.index.month])
    res = [] 
    for (year, month), rets in mth_returns:
        ret = (rets + 1).prod() - 1
        res.append(MonthReturn(
            year=year,
            month=month,
            value=ret
        ))
    return res
        


def annual_returns(returns: pd.Series) -> list[YearReturn]:
    """One return for each calendar year that contains observations."""
    ann_returns = returns.groupby([returns.index.year])
    res = [] 
    for (year,), rets in ann_returns:
        ret = (rets + 1).prod() - 1 
        res.append(YearReturn(
            year=year,
            value=ret 
        ))
    return res 


def rolling_return(returns: pd.Series, window: int, periods_per_year: float) -> pd.Series:
    """Annualized return over each trailing window, indexed by the window's last date."""
    rets = [annualized_return(returns[i:i+window], periods_per_year) for i in range(0, len(returns)-window+1)]
    dates = [returns.index[i+window-1] for i in range(0, len(returns)-window+1)]
    return pd.Series(rets, index=dates)


def rolling_volatility(returns: pd.Series, window: int, periods_per_year: float) -> pd.Series:
    """Annualized volatility over each trailing window, indexed by the window's last date."""
    vols = [annualized_volatility(returns[i:i+window], periods_per_year) for i in range(0, len(returns)-window+1)]
    dates = [returns.index[i+window-1] for i in range(0, len(returns)-window+1)]
    return pd.Series(vols, index=dates)


def rolling_sharpe(excess: pd.Series, window: int, periods_per_year: float) -> pd.Series:
    """Sharpe over each trailing window, indexed by the window's last date."""
    values = []
    dates = []
    for i in range(0, len(excess) - window + 1):
        chunk = excess[i:i + window]
        if chunk.std() < 1e-12:
            continue
        values.append(sharpe(chunk, periods_per_year))
        dates.append(excess.index[i + window - 1])
    return pd.Series(values, index=dates).dropna()


def build_performance(panel: AnalysisInput) -> PerformanceModel | None:
    """Performance section, including one rolling entry per window in ROLLING_WINDOWS. None until implemented."""
    data = prepare(panel)
    returns = to_period_returns(data.strategy, data.kind)
    excess = excess_returns(returns, data.risk_free)
    growths = growth_of_unit(returns)
    dd = underwater(growths)
    benchmark_growth = None
    if data.benchmark is not None:
        benchmark_returns = to_period_returns(data.benchmark, data.kind)
        benchmark_growth = to_points(growth_of_unit(benchmark_returns))

    return PerformanceModel(
        cumulative=to_points(growths),
        benchmarkCumulative=benchmark_growth,
        drawdown=to_points(dd),
        monthlyReturns=monthly_returns(returns),
        annualReturns=annual_returns(returns),
        drawdownEpisodes=episodes(dd),
        rolling=[PerformanceRolling(
            window=w,
            return_=to_points(rolling_return(returns, w, data.periods_per_year)),
            volatility=to_points(rolling_volatility(returns, w, data.periods_per_year)),
            sharpe=to_points(rolling_sharpe(excess, w, data.periods_per_year))
        ) for w in ROLLING_WINDOWS]
    )

'''
class PerformanceModel(BaseModel):
    cumulative: list[Point]
    benchmarkCumulative: list[Point] | None
    drawdown: list[Point]
    monthlyReturns: list[MonthReturn]
    annualReturns: list[YearReturn]
    drawdownEpisodes: list[DrawdownEpisode]
    rolling: list[PerformanceRolling]
'''
if __name__ == "__main__":
    from tests.support import on, panel

    MONTHS = on(["2020-01-15", "2020-01-20", "2020-02-03"], [0.10, -0.05, 0.02])
    WINDOWS = on(["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09"], [0.01, -0.02, 0.03, 0.00])
    found = rolling_return(WINDOWS, 3, 12 )
    print(found)
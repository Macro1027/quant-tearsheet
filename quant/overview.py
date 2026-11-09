"""Headline tiles. Composition of returns and drawdown; no new statistic."""

from api.schemas import AnalysisInput, OverviewModel
from quant.series import prepare 
from quant.tools import date_to_str
from quant.returns import *
from quant.drawdown import * 

def build_overview(panel: AnalysisInput) -> OverviewModel | None:
    """Overview tiles for the panel. None until the quantities it needs exist."""
    data = prepare(panel)
    returns = to_period_returns(data.strategy, data.kind)
    growths = growth_of_unit(returns)
    dd_path = underwater(growths)
    max_dd = max_drawdown(dd_path)
    ppy = data.periods_per_year
    ann_ret = annualized_return(returns, ppy)
    return OverviewModel(
        start=date_to_str(returns.index[0]),
        end=date_to_str(returns.index[-1]),
        observations=len(returns),
        totalGrowth=total_growth(growths),
        annualizedReturn=ann_ret,
        annualizedVolatility=annualized_volatility(returns, ppy),
        sharpe=sharpe(excess_returns(returns, data.risk_free), ppy),
        maxDrawdown=max_dd,
        calmar=calmar(ann_ret, max_dd)
    )
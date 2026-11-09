"""Headline tiles. Composition of returns and drawdown; no new statistic."""

from api.schemas import AnalysisInput, OverviewModel
from quant.series import prepare 
from quant.tools import date_to_str
import quant.returns as ret
import quant.drawdown as dd 

def build_overview(panel: AnalysisInput) -> OverviewModel | None:
    """Overview tiles for the panel. None until the quantities it needs exist."""
    data = prepare(panel)
    returns = ret.to_period_returns(data.strategy, data.kind)
    growths = ret.growth_of_unit(returns)
    dd_path = dd.underwater(growths)
    max_dd = dd.max_drawdown(dd_path)
    ppy = data.periods_per_year
    ann_ret = ret.annualized_return(returns, ppy)
    return OverviewModel(
        start=date_to_str(returns.index[0]),
        end=date_to_str(returns.index[-1]),
        observations=len(returns),
        totalGrowth=ret.total_growth(growths),
        annualizedReturn=ann_ret,
        annualizedVolatility=ret.annualized_volatility(returns, ppy),
        sharpe=ret.sharpe(ret.excess_returns(returns, data.risk_free), ppy),
        maxDrawdown=max_dd,
        calmar=dd.calmar(ann_ret, max_dd)
    )

if __name__ == "__main__":
    from tests.support import on, panel

    sample = panel(
        on(["2020-01-31", "2020-02-29", "2020-03-31"], [0.01, -0.02, 0.03]),
        kind="price", frequency="monthly"
    )
    
    print(build_overview(sample))
from quant.overview import build_overview
from tests.support import close, filled, on, panel


def test_build_overview_compounds_the_strategy_and_uses_its_drawdown():
    returns = on(["2020-01-31", "2020-02-29", "2020-03-31"], [0.01, -0.02, 0.03])
    model = filled(build_overview(panel(returns, frequency="monthly")))
    assert model.start == "2020-01-31"
    assert model.end == "2020-03-31"
    assert model.observations == 3
    assert model.totalGrowth == close(0.019494)
    assert model.annualizedReturn == close(0.08028587275861132)
    assert model.annualizedVolatility == close(0.08717797887081347)
    assert model.sharpe == close(0.9176629354822469)
    assert model.maxDrawdown == close(-0.02)
    assert model.calmar == close(4.014293637930566)


def test_build_overview_turns_prices_into_returns_before_the_tiles():
    prices = on(["2020-01-31", "2020-02-29", "2020-03-31"], [100, 110, 99])
    model = filled(build_overview(panel(prices, kind="price", frequency="monthly")))
    assert model.start == "2020-02-29"
    assert model.end == "2020-03-31"
    assert model.observations == 2
    assert model.totalGrowth == close(-0.01)
    assert model.annualizedReturn == close(-0.058519850598999446)
    assert model.annualizedVolatility == close(0.4898979485566356)
    assert model.sharpe == close(0)
    assert model.maxDrawdown == close(-0.1)
    assert model.calmar == close(-0.5851985059899946)


def test_build_overview_sharpe_uses_the_risk_free_series():
    returns = on(["2020-01-31", "2020-02-29"], [0.01, 0.03])
    risk_free = on(["2020-01-31", "2020-02-29"], [0.01, 0.01])
    model = filled(build_overview(panel(returns, frequency="monthly", risk_free=risk_free)))
    assert model.totalGrowth == close(0.0403)
    assert model.annualizedReturn == close(0.2675105736369341)
    assert model.annualizedVolatility == close(0.04898979485566356)
    assert model.sharpe == close(2.4494897427831783)
    assert model.maxDrawdown == close(0)
    assert model.calmar is None


def test_build_overview_applies_a_percent_scale_before_the_tiles():
    quoted = on(["2020-01-31", "2020-02-29"], [1, -2])
    model = filled(build_overview(panel(quoted, frequency="monthly", strategy_scale="percent")))
    assert model.observations == 2
    assert model.totalGrowth == close(-0.0102)
    assert model.annualizedReturn == close(-0.05966046245649825)
    assert model.sharpe == close(-0.8164965809277259)
    assert model.maxDrawdown == close(-0.02)

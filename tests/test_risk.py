import pandas as pd

from quant.risk import TAIL_CONFIDENCE, build_risk, downside_deviation, expected_shortfall, value_at_risk, worst_periods
from tests.support import close, filled, on, panel

LOSING = on(["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09"], [0.02, -0.04, 0.01, -0.02])
TAIL = pd.Series(range(-19, 21), dtype="float64")
RETURNS = on(
    ["2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07", "2020-01-08"],
    [0.02, -0.04, 0.01, -0.02, 0.03],
)


def test_downside_deviation_is_the_annualized_spread_of_losing_periods():
    assert downside_deviation(LOSING, 252) == close(0.2244994432064365)


def test_downside_deviation_is_none_when_nothing_lost():
    assert downside_deviation(on(["2020-01-06", "2020-01-07"], [0.01, 0.02]), 252) is None


def test_downside_deviation_is_none_when_only_one_period_lost():
    assert downside_deviation(on(["2020-01-06", "2020-01-07"], [0.01, -0.02]), 252) is None


def test_value_at_risk_is_the_kth_smallest_return():
    assert value_at_risk(TAIL, 0.95) == close(-18)
    assert value_at_risk(TAIL, 0.99) == close(-19)


def test_expected_shortfall_averages_those_same_tail_returns():
    assert expected_shortfall(TAIL, 0.95) == close(-18.5)
    assert expected_shortfall(TAIL, 0.99) == close(-19)


def test_worst_periods_returns_the_worst_fraction_most_negative_first():
    series = on(
        ["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09", "2020-01-10", "2020-01-13"],
        [10, -1, -5, -3, -4, -2],
    )
    found = worst_periods(series, fraction=0.5, limit=2)
    assert [(row.date, row.value) for row in found] == [("2020-01-08", close(-5)), ("2020-01-10", close(-4))]


def test_worst_periods_uses_the_same_tail_count_as_value_at_risk():
    dated = pd.Series(range(-19, 21), index=pd.date_range("2020-01-01", periods=40), dtype="float64")
    found = worst_periods(dated, fraction=0.05, limit=20)
    assert [row.value for row in found] == close([-19, -18])


def test_build_risk_reports_both_tails_and_the_drawdown_summaries():
    model = filled(build_risk(panel(RETURNS, frequency="daily")))
    assert model.observations == 5
    assert model.annualizedVolatility == close(0.4628174586162454)
    assert model.downsideDeviation == close(0.2244994432064365)
    assert model.maxDrawdown == close(-0.049792)
    assert model.averageDrawdown == close(-0.049792)
    assert model.ulcerIndex == close(0.03303479027564002)
    assert [row.confidence for row in model.byConfidence] == list(TAIL_CONFIDENCE)
    by_confidence = {row.confidence: row for row in model.byConfidence}
    assert by_confidence[0.95].valueAtRisk == close(-0.04)
    assert by_confidence[0.95].expectedShortfall == close(-0.04)
    assert by_confidence[0.99].valueAtRisk == close(-0.04)
    assert [(row.date, row.value) for row in model.worstPeriods] == [("2020-01-03", close(-0.04))]

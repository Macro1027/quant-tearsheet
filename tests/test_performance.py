import pandas as pd

from quant.performance import (
    ROLLING_WINDOWS,
    annual_returns,
    build_performance,
    monthly_returns,
    rolling_return,
    rolling_sharpe,
    rolling_volatility,
)
from tests.support import assert_series, close, filled, on, panel

MONTHS = on(["2020-01-15", "2020-01-20", "2020-02-03"], [0.10, -0.05, 0.02])
WINDOWS = on(["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09"], [0.01, -0.02, 0.03, 0.00])


def test_monthly_returns_compound_inside_each_calendar_month():
    found = monthly_returns(MONTHS)
    assert [(row.year, row.month, row.value) for row in found] == [
        (2020, 1, close(0.045)),
        (2020, 2, close(0.02)),
    ]


def test_annual_returns_compound_inside_each_calendar_year():
    found = annual_returns(MONTHS)
    assert [(row.year, row.value) for row in found] == [(2020, close(0.0659))]


def test_rolling_return_is_geometric_and_labeled_by_the_window_end():
    expected = on(["2020-01-08", "2020-01-09"], [0.08028587275861132, 0.03813349014348999])
    assert_series(rolling_return(WINDOWS, 3, 12), expected)


def test_rolling_volatility_is_the_annualized_sample_spread_of_the_window():
    expected = on(["2020-01-08", "2020-01-09"], [0.08717797887081347, 0.08717797887081347])
    assert_series(rolling_volatility(WINDOWS, 3, 12), expected)


def test_rolling_sharpe_omits_a_window_whose_spread_is_zero():
    flat_then_step = on(["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09"], [0.01, 0.01, 0.02, 0.02])
    assert_series(rolling_sharpe(flat_then_step, 2, 12), on(["2020-01-08"], [7.348469228349534]))


def test_build_performance_fills_path_calendar_and_drawdown_slots():
    benchmark = on(["2020-01-15", "2020-01-20", "2020-02-03"], [0.02, 0.00, -0.01])
    model = filled(build_performance(panel(MONTHS, frequency="monthly", benchmark=benchmark)))
    assert [(point.date, point.value) for point in model.cumulative] == [
        ("2020-01-15", close(1.1)),
        ("2020-01-20", close(1.045)),
        ("2020-02-03", close(1.0659)),
    ]
    assert model.benchmarkCumulative[-1].value == close(1.0098)
    assert [(point.date, point.value) for point in model.drawdown] == [
        ("2020-01-15", close(0)),
        ("2020-01-20", close(-0.05)),
        ("2020-02-03", close(-0.031)),
    ]
    assert [(row.year, row.month) for row in model.monthlyReturns] == [(2020, 1), (2020, 2)]
    assert model.annualReturns[0].value == close(0.0659)
    assert model.drawdownEpisodes[0].start == "2020-01-15"
    assert model.drawdownEpisodes[0].trough == "2020-01-20"
    assert model.drawdownEpisodes[0].end is None
    assert model.drawdownEpisodes[0].depth == close(-0.05)
    assert [row.window for row in model.rolling] == list(ROLLING_WINDOWS)
    for row in model.rolling:
        assert row.return_ is None or row.return_ == []
        assert row.volatility is None or row.volatility == []
        assert row.sharpe is None or row.sharpe == []


def test_build_performance_emits_one_point_per_complete_rolling_window():
    index = pd.bdate_range("2020-01-02", periods=25)
    returns = pd.Series(0.01, index=index, dtype="float64")
    model = filled(build_performance(panel(returns, frequency="daily")))
    assert model.cumulative[-1].date == "2020-02-05"
    assert model.cumulative[-1].value == close(1.2824319950172338)
    by_window = {row.window: row for row in model.rolling}
    finished = by_window[21]
    assert finished.return_ is not None and len(finished.return_) == 5
    assert finished.return_[-1].date == "2020-02-05"
    assert finished.return_[-1].value == close(11.274002099240244)
    assert finished.volatility is not None and len(finished.volatility) == 5
    assert finished.volatility[-1].value == close(0)
    assert finished.sharpe is None or finished.sharpe == []
    assert by_window[63].return_ is None or by_window[63].return_ == []

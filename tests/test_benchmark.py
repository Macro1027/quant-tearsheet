from quant.benchmark import (
    ROLLING_WINDOWS,
    active_returns,
    batting_average,
    build_benchmark,
    down_capture,
    information_ratio,
    rolling_beta,
    rolling_correlation,
    tracking_error,
    up_capture,
)
from tests.support import assert_series, close, filled, on, panel

STRATEGY = on(["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09"], [0.02, -0.01, 0.03, -0.04])
BENCHMARK = on(["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09"], [0.01, -0.02, 0.02, -0.01])
ACTIVE = on(["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09"], [0.01, 0.01, 0.01, -0.03])


def test_active_returns_subtracts_the_benchmark_period_by_period():
    assert_series(active_returns(STRATEGY, BENCHMARK), ACTIVE)


def test_tracking_error_is_the_annualized_sample_spread_of_active_returns():
    assert tracking_error(ACTIVE, 252) == close(0.3174901573277509)


def test_information_ratio_is_annualized_active_return_over_tracking_error():
    """Geometric annualized active return divided by tracking error."""
    assert information_ratio(ACTIVE, 252) == close(-0.1184059091427739)


def test_information_ratio_is_none_when_tracking_error_is_zero():
    assert information_ratio(on(["2020-01-06", "2020-01-07"], [0.01, 0.01]), 252) is None


def test_batting_average_counts_only_periods_strictly_ahead():
    strategy = on(["2020-01-06", "2020-01-07", "2020-01-08"], [0.01, 0.02, 0.00])
    benchmark = on(["2020-01-06", "2020-01-07", "2020-01-08"], [0.01, 0.01, 0.02])
    assert batting_average(strategy, benchmark) == close(1 / 3)


def test_up_capture_is_the_ratio_of_geometric_means_in_rising_benchmark_periods():
    assert up_capture(STRATEGY, BENCHMARK) == close(1.6672224817758734)


def test_up_capture_is_none_when_the_benchmark_never_rose():
    falling = on(["2020-01-06", "2020-01-07"], [-0.01, -0.02])
    assert up_capture(on(["2020-01-06", "2020-01-07"], [0.01, 0.02]), falling) is None


def test_down_capture_is_the_ratio_of_geometric_means_in_falling_benchmark_periods():
    assert down_capture(STRATEGY, BENCHMARK) == close(1.6729440701482963)


def test_down_capture_is_none_when_the_benchmark_never_fell():
    rising = on(["2020-01-06", "2020-01-07"], [0.01, 0.02])
    assert down_capture(on(["2020-01-06", "2020-01-07"], [-0.01, -0.02]), rising) is None


def test_rolling_beta_is_the_slope_over_each_trailing_window():
    expected = on(["2020-01-08", "2020-01-09"], [1, 1.307692307692308])
    assert_series(rolling_beta(STRATEGY, BENCHMARK, 3), expected)


def test_rolling_correlation_is_the_pearson_correlation_over_each_trailing_window():
    expected = on(["2020-01-08", "2020-01-09"], [1, 0.7751332793988406])
    assert_series(rolling_correlation(STRATEGY, BENCHMARK, 3), expected)


def test_build_benchmark_is_none_without_a_benchmark():
    assert build_benchmark(panel(STRATEGY)) is None


def test_build_benchmark_compounds_strategy_benchmark_and_active_paths():
    model = filled(build_benchmark(panel(STRATEGY, frequency="daily", benchmark=BENCHMARK)))
    assert model.strategyCumulative[-1].value == close(0.99849024)
    assert model.benchmarkCumulative[-1].value == close(0.99950004)
    assert model.activeCumulative[-1].value == close(0.99939197)
    assert model.annualizedActiveReturn == close(-0.03759271072227466)
    assert model.trackingError == close(0.3174901573277509)
    assert model.informationRatio == close(-0.1184059091427739)
    assert model.battingAverage == close(0.75)
    assert model.upCapture == close(1.6672224817758734)
    assert model.downCapture == close(1.6729440701482963)
    assert [row.window for row in model.rolling] == list(ROLLING_WINDOWS)

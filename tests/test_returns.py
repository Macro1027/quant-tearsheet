import pandas as pd

from quant.returns import (
    annualized_return,
    annualized_volatility,
    excess_kurtosis,
    excess_returns,
    growth_of_unit,
    period_mean,
    period_volatility,
    sharpe,
    skewness,
    to_period_returns,
    total_growth,
)
from tests.support import assert_series, close, on

PRICES = on(["2020-01-31", "2020-02-29", "2020-03-31"], [100, 110, 99])
RETURNS = on(["2020-01-31", "2020-02-29"], [0.10, -0.10])


def test_to_period_returns_turns_a_price_into_a_simple_return():
    assert_series(to_period_returns(PRICES, "price"), RETURNS)


def test_to_period_returns_leaves_a_return_series_unchanged():
    assert_series(to_period_returns(RETURNS, "returns"), RETURNS)


def test_to_period_returns_leaves_an_excess_series_unchanged():
    assert_series(to_period_returns(RETURNS, "excess"), RETURNS)


def test_excess_returns_subtracts_the_risk_free_series():
    risk_free = on(["2020-01-31", "2020-02-29"], [0.01, 0.02])
    assert_series(excess_returns(RETURNS, risk_free), on(["2020-01-31", "2020-02-29"], [0.09, -0.12]))


def test_excess_returns_without_a_risk_free_series_is_the_return_itself():
    assert_series(excess_returns(RETURNS, None), RETURNS)


def test_growth_of_unit_compounds_from_the_first_return():
    assert_series(growth_of_unit(RETURNS), on(["2020-01-31", "2020-02-29"], [1.10, 0.99]))


def test_total_growth_is_the_ending_level_minus_one():
    growth = on(["2020-01-31", "2020-02-29"], [1.10, 0.99])
    assert total_growth(growth) == close(-0.01)


def test_annualized_return_compounds_and_scales_by_periods_per_year():
    assert annualized_return(RETURNS, 12) == close(-0.058519850598999446)


def test_annualized_volatility_scales_the_sample_spread():
    assert annualized_volatility(RETURNS, 12) == close(0.4898979485566356)


def test_sharpe_is_mean_over_sample_spread_scaled_to_a_year():
    excess = on(["2020-01-31", "2020-02-29"], [0.01, 0.03])
    assert sharpe(excess, 12) == close(4.898979485566356)


def test_sharpe_is_none_when_the_spread_is_zero():
    flat = on(["2020-01-31", "2020-02-29"], [0.01, 0.01])
    assert sharpe(flat, 12) is None


def test_period_mean_is_the_arithmetic_average():
    assert period_mean(on(["2020-01-31", "2020-02-29", "2020-03-31"], [0.01, 0.02, 0.03])) == close(0.02)


def test_period_volatility_is_the_sample_spread_without_annualizing():
    assert period_volatility(RETURNS) == close(0.14142135623730953)


def test_skewness_is_the_unbiased_sample_skewness():
    sample = pd.Series([0.01, 0.02, 0.03, 0.04, -0.02, 0.05, 0.00, 0.08], dtype="float64")
    assert skewness(sample) == close(0.31404276336338965)


def test_excess_kurtosis_is_the_unbiased_excess_over_a_normal_bell():
    sample = pd.Series([0.01, 0.02, 0.03, 0.04, -0.02, 0.05, 0.00, 0.08], dtype="float64")
    assert excess_kurtosis(sample) == close(0.14050853148560757)

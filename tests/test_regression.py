import math

import numpy as np
import pandas as pd
import pytest

from quant.regression import autocorrelation, build_regression, diagnostics, fit_line, histogram, ols, qq_normal
from tests.support import close, filled, on, panel

SAMPLE = pd.Series([1.0, 2.0, 3.0, 4.0])
LINE = on(["2020-01-02", "2020-01-03", "2020-01-06"], [1.0, 2.0, 3.0])
FITTED = on(["2020-01-02", "2020-01-03", "2020-01-06"], [5.0, 8.0, 11.0])
Y = on(
    ["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09", "2020-01-10"],
    [3.1, 4.8, 7.05, 9.0, 11.05],
)
X = on(
    ["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09", "2020-01-10"],
    [1, 2, 3, 4, 5],
)


def test_histogram_uses_equal_width_bins_from_the_sample_min_to_its_max():
    found = histogram(SAMPLE, bins=2)
    assert [(row.x0, row.x1, row.count) for row in found] == [
        (close(1), close(2.5), 2),
        (close(2.5), close(4), 2),
    ]


def test_histogram_defaults_to_twenty_bins_that_cover_every_sample():
    sample = pd.Series(np.linspace(-0.02, 0.02, 40))
    found = histogram(sample)
    assert len(found) == 20
    assert sum(row.count for row in found) == 40
    assert found[0].x0 == close(-0.02)
    assert found[-1].x1 == close(0.02)


def test_qq_normal_pairs_sorted_samples_with_hazen_normal_quantiles():
    """Plotting position (i - 0.5) / n on the standard normal, sample sorted ascending."""
    found = qq_normal(pd.Series([3.0, 1.0, 4.0, 2.0]))
    assert [row.sample for row in found] == close([1, 2, 3, 4])
    assert [row.theoretical for row in found] == close(
        [-1.1503493803760079, -0.31863936396437514, 0.31863936396437514, 1.1503493803760079]
    )


def test_autocorrelation_uses_the_whole_series_as_the_divisor():
    found = autocorrelation(pd.Series([1.0, 2.0, 3.0, 4.0, 5.0]), lags=2)
    assert [(row.lag, row.value) for row in found] == [(1, close(0.4)), (2, close(-0.1))]


def test_autocorrelation_stops_at_the_last_lag_the_sample_can_support():
    found = autocorrelation(pd.Series([1.0, 2.0, 3.0, 4.0, 5.0]), lags=20)
    assert [row.lag for row in found] == [1, 2, 3, 4]


def test_fit_line_is_the_straight_line_through_paired_points():
    found = fit_line(FITTED, LINE)
    assert found.intercept == close(2)
    assert found.slope == close(3)
    assert [point.value for point in found.x] == close([1, 2, 3])
    assert [point.value for point in found.y] == close([5, 8, 11])
    assert [point.date for point in found.x] == ["2020-01-02", "2020-01-03", "2020-01-06"]


def test_fit_line_is_none_when_there_are_fewer_than_two_points():
    assert fit_line(on(["2020-01-02"], [1.0]), on(["2020-01-02"], [2.0])) is None
    assert fit_line(on([], []), on([], [])) is None


def test_ols_reports_coefficients_fit_and_residual_inference():
    """Residual variance divides by n minus the number of coefficients. p-values are two-sided t."""
    found = ols(Y, X.to_frame("Mkt"))
    assert [row.name for row in found.coefficients] == ["intercept", "Mkt"]
    assert [row.estimate for row in found.coefficients] == close([0.97, 2.01])
    assert [row.stdError for row in found.coefficients] == close([0.1407124727947031, 0.0424264068711929])
    assert [row.tStat for row in found.coefficients] == close([6.893489828831364, 47.376154339498605])
    assert [row.pValue for row in found.coefficients] == pytest.approx([0.00625451, 2.07059517e-05], rel=1e-4, abs=1e-12)
    assert found.r_squared == close(0.9986651835372636)
    assert found.adjusted_r_squared == close(0.9982202447163515)
    assert found.residual_std_error == close(0.13416407864998758)
    assert list(found.residuals.to_numpy()) == close([0.12, -0.19, 0.05, -0.01, 0.03])


def test_ols_without_an_intercept_fits_the_columns_as_given():
    exact = on(["2020-01-06", "2020-01-07", "2020-01-08"], [2.0, 4.0, 6.0])
    regressor = on(["2020-01-06", "2020-01-07", "2020-01-08"], [1.0, 2.0, 3.0])
    found = ols(exact, regressor.to_frame("x"), add_intercept=False)
    assert [row.name for row in found.coefficients] == ["x"]
    assert found.coefficients[0].estimate == close(2)
    assert list(found.residuals.to_numpy()) == close([0, 0, 0])
    assert found.r_squared == close(1)


def test_diagnostics_returns_named_results():
    found = diagnostics(pd.Series([0.01, -0.02, 0.005, 0.0, 0.01]))
    assert isinstance(found, list)
    for row in found:
        assert row.name
        assert math.isfinite(row.value)


def test_build_regression_without_a_benchmark_reports_the_shape_of_the_returns():
    model = filled(build_regression(panel(Y, frequency="daily")))
    assert model.observations == 5
    assert model.mean == close(7)
    assert model.volatility == close(3.180212257067129)
    assert model.skewness == close(0.05781914305850748)
    assert model.excessKurtosis == close(-1.4032824709401446)
    assert model.fit is None
    assert sum(row.count for row in model.histogram) == 5
    assert len(model.qq) == 5
    lag_one = next(row for row in model.autocorrelation if row.lag == 1)
    assert lag_one.value == close(0.4120627858113954)
    assert model.diagnostics is not None


def test_build_regression_with_a_benchmark_fits_that_line():
    model = filled(build_regression(panel(Y, frequency="daily", benchmark=X)))
    assert model.fit.intercept == close(0.97)
    assert model.fit.slope == close(2.01)
    names = [row.name.lower() for row in model.coefficients]
    assert names[:2] == ["intercept", "benchmark"]
    assert model.rSquared == close(0.9986651835372636)


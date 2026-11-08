import pandas as pd

from quant.factors import (
    annualized_residual_volatility,
    build_factors,
    correlation_matrix,
    residual_volatility,
    return_contribution,
    risk_share,
)
from api.schemas import Coefficient
from tests.support import close, filled, on, panel

RESIDUALS = on(["2020-01-06", "2020-01-07"], [0.01, -0.01])
Y = on(
    ["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09", "2020-01-10"],
    [3.1, 4.8, 7.05, 9.0, 11.05],
)
MKT = on(
    ["2020-01-06", "2020-01-07", "2020-01-08", "2020-01-09", "2020-01-10"],
    [1, 2, 3, 4, 5],
)


def test_residual_volatility_is_the_sample_spread_of_the_residuals():
    assert residual_volatility(RESIDUALS) == close(0.01414213562373095)


def test_annualized_residual_volatility_scales_that_spread():
    assert annualized_residual_volatility(RESIDUALS, 252) == close(0.2244994432064365)


def test_annualized_residual_volatility_is_none_for_a_single_residual():
    assert annualized_residual_volatility(on(["2020-01-06"], [0.01]), 252) is None


def test_return_contribution_is_each_coefficient_times_the_factor_mean():
    coefficients = [
        Coefficient(name="intercept", estimate=0.01, stdError=0.1, tStat=0.1, pValue=0.9),
        Coefficient(name="Mkt", estimate=0.5, stdError=0.1, tStat=5, pValue=0.01),
    ]
    factors = pd.DataFrame({"Mkt": on(["2020-01-06", "2020-01-07"], [0.02, 0.04])})
    found = return_contribution(coefficients, factors)
    assert found[0].name.lower() == "intercept"
    assert found[0].value == close(0.01)
    assert found[1].name == "Mkt"
    assert found[1].value == close(0.015)


def test_risk_share_splits_variance_into_fractions_that_sum_to_one():
    found = risk_share(0.3, 0.7)
    assert found.systematic == close(0.3)
    assert found.idiosyncratic == close(0.7)


def test_correlation_matrix_lines_strategy_up_with_the_factor_columns():
    strategy = on(["2020-01-06", "2020-01-07", "2020-01-08"], [1, 2, 3])
    factors = pd.DataFrame(
        {
            "A": on(["2020-01-06", "2020-01-07", "2020-01-08"], [1, 2, 3]),
            "B": on(["2020-01-06", "2020-01-07", "2020-01-08"], [3, 2, 1]),
        }
    )
    found = correlation_matrix(strategy, factors)
    assert found.names[1:] == ["A", "B"]
    assert found.matrix[0] == close([1, 1, -1])
    assert found.matrix[1] == close([1, 1, -1])
    assert found.matrix[2] == close([-1, -1, 1])


def test_build_factors_is_none_without_factors():
    assert build_factors(panel(Y)) is None


def test_build_factors_uses_one_fit_for_exposure_contribution_and_risk():
    model = filled(build_factors(panel(Y, frequency="daily", factors={"Mkt": MKT})))
    assert [row.name.lower() for row in model.coefficients][:2] == ["intercept", "mkt"]
    assert [row.estimate for row in model.coefficients] == close([0.97, 2.01])
    assert model.rSquared == close(0.9986651835372636)
    assert model.residualVolatility == close(0.11618950038622251)
    assert model.annualizedResidualVolatility == close(1.844451137872728)
    assert model.returnContribution[0].name.lower() == "intercept"
    assert model.returnContribution[0].value == close(0.97)
    assert model.returnContribution[1].value == close(6.03)
    assert model.riskShare.systematic == close(model.rSquared)
    assert model.riskShare.idiosyncratic == close(1 - model.rSquared)
    assert model.correlation.names[1:] == ["Mkt"]
    assert model.correlation.matrix[0][1] == close(0.9993323689029908)

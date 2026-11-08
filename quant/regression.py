"""Shape of the period returns, and a straight-line fit against the benchmark."""

from dataclasses import dataclass

import pandas as pd

from api.schemas import (
    AnalysisInput,
    Autocorrelation,
    Coefficient,
    Diagnostic,
    FitModel,
    HistogramBin,
    QQPoint,
    RegressionModel,
)


@dataclass(frozen=True)
class RegressionFit:
    """One fitted line: coefficients, fit statistics, and the residual series."""

    coefficients: list[Coefficient]
    r_squared: float | None
    adjusted_r_squared: float | None
    residual_std_error: float | None
    residuals: pd.Series


def histogram(samples: pd.Series, bins: int = 20) -> list[HistogramBin]:
    """Bin edges and counts for the sample."""
    raise NotImplementedError


def qq_normal(samples: pd.Series) -> list[QQPoint]:
    """Sample quantiles against the quantiles of a standard normal."""
    raise NotImplementedError


def autocorrelation(returns: pd.Series, lags: int = 20) -> list[Autocorrelation]:
    """Autocorrelation at each lag from 1 through lags."""
    raise NotImplementedError


def fit_line(y: pd.Series, x: pd.Series) -> FitModel | None:
    """Paired points and the straight-line fit of y on x. None when x is missing."""
    raise NotImplementedError


def ols(y: pd.Series, regressors: pd.DataFrame, add_intercept: bool = True) -> RegressionFit:
    """Fit y on the regressors. An intercept column is included when add_intercept is true."""
    raise NotImplementedError


def diagnostics(residuals: pd.Series) -> list[Diagnostic]:
    """Named residual tests. Empty until a test is implemented."""
    raise NotImplementedError


def build_regression(panel: AnalysisInput) -> RegressionModel | None:
    """Moments, histogram, quantiles, autocorrelation, and the benchmark regression. None until implemented."""
    return None

"""Exposures to the uploaded factors, and the return and risk those factors account for."""

import pandas as pd

from api.schemas import AnalysisInput, Coefficient, CorrelationMatrix, FactorModel, NamedValue, RiskShare


def residual_volatility(residuals: pd.Series) -> float:
    """Spread of the residual series, in the series' own frequency."""
    raise NotImplementedError


def annualized_residual_volatility(residuals: pd.Series, periods_per_year: float) -> float | None:
    """Residual spread scaled to a year. None when the residual series is too short to scale."""
    raise NotImplementedError


def return_contribution(coefficients: list[Coefficient], factors: pd.DataFrame) -> list[NamedValue]:
    """Each factor's contribution to mean return, plus the intercept's contribution."""
    raise NotImplementedError


def risk_share(systematic_variance: float, idiosyncratic_variance: float) -> RiskShare:
    """Share of variance that is systematic and share that is idiosyncratic."""
    raise NotImplementedError


def correlation_matrix(strategy: pd.Series, factors: pd.DataFrame) -> CorrelationMatrix:
    """Correlations among the strategy and the factor columns. Names line up with the matrix."""
    raise NotImplementedError


def build_factors(panel: AnalysisInput) -> FactorModel | None:
    """Factor section, using ols for the fit. None when the panel has no factors, and None until implemented."""
    return None

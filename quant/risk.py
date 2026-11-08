"""Size of losses: downside, drawdown summaries, and the left tail."""

import pandas as pd

from api.schemas import AnalysisInput, RiskModel, WorstPeriod

TAIL_CONFIDENCE: tuple[float, float] = (0.95, 0.99)


def downside_deviation(returns: pd.Series, periods_per_year: float) -> float | None:
    """Spread of the losing periods only, scaled to a year. None when there is no losing period."""
    raise NotImplementedError


def value_at_risk(returns: pd.Series, confidence: float) -> float:
    """Loss threshold at this confidence. confidence is 0.95 or 0.99."""
    raise NotImplementedError


def expected_shortfall(returns: pd.Series, confidence: float) -> float:
    """Average loss in the periods beyond the value-at-risk threshold."""
    raise NotImplementedError


def worst_periods(returns: pd.Series, fraction: float = 0.05, limit: int = 20) -> list[WorstPeriod]:
    """The worst fraction of period returns, most negative first, capped at limit."""
    raise NotImplementedError


def build_risk(panel: AnalysisInput) -> RiskModel | None:
    """Risk section, with one tail pair per level in TAIL_CONFIDENCE. None until implemented."""
    return None

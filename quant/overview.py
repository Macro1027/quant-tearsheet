"""Headline tiles. Composition of returns and drawdown; no new statistic."""

from api.schemas import AnalysisInput, OverviewModel


def build_overview(panel: AnalysisInput) -> OverviewModel | None:
    """Overview tiles for the panel. None until the quantities it needs exist."""
    return None

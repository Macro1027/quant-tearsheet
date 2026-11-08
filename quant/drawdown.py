"""The underwater path, and the quantities cut from it."""

import pandas as pd

from api.schemas import DrawdownEpisode


def underwater(growth: pd.Series) -> pd.Series:
    """Depth below the running peak at each date. Zero at a peak, negative below it."""
    raise NotImplementedError


def max_drawdown(path: pd.Series) -> float:
    """Deepest value on the underwater path."""
    raise NotImplementedError


def average_drawdown(path: pd.Series) -> float | None:
    """Typical depth of the underwater stretches. None when the path never leaves a peak."""
    raise NotImplementedError


def ulcer_index(path: pd.Series) -> float | None:
    """Drawdown measure that weighs deeper losses more. None when the path is empty."""
    raise NotImplementedError


def episodes(path: pd.Series) -> list[DrawdownEpisode]:
    """Each peak-to-recovery run, deepest first. An unfinished run has no end and no recovery."""
    raise NotImplementedError


def calmar(annualized_return: float, deepest: float) -> float | None:
    """Annualized return relative to the deepest drawdown. None when that depth is zero."""
    raise NotImplementedError

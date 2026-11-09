"""The underwater path, and the quantities cut from it."""

import pandas as pd

from api.schemas import DrawdownEpisode


def underwater(growth: pd.Series) -> pd.Series:
    """Depth below the running peak at each date. Zero at a peak, negative below it."""
    peak = growth.iloc[0]

    depths = []
    for v in growth:
        peak = max(peak, v)
        depths.append(v / peak - 1)

    return pd.Series(depths, index=growth.index)


def max_drawdown(path: pd.Series) -> float:
    """Deepest value on the underwater path."""
    return path.min()


def average_drawdown(path: pd.Series) -> float | None:
    """Typical depth of the underwater stretches. None when the path never leaves a peak."""
    n = 0
    dd_tot = 0
    cur_min = 0
    for depth in path: 
        cur_min = min(cur_min, depth)
        if depth == 0 and cur_min < 0:
            n += 1
            dd_tot += cur_min
            cur_min = 0 

    if n == 0:
        return None
    return dd_tot / n


def ulcer_index(path: pd.Series) -> float | None:
    """Drawdown measure that weighs deeper losses more. None when the path is empty."""
    if len(path) == 0:
        return None 

    return (((path ** 2).sum())/len(path)) ** 0.5


def episodes(path: pd.Series) -> list[DrawdownEpisode]:
    def date_to_str(stamp) -> str:
        return pd.Timestamp(stamp).strftime("%Y-%m-%d")

    found = []
    start = None
    trough_date = None
    trough = 0
    length = 0
    recovery = 0
    falling = False

    for date, depth in path.items():
        if depth == 0:
            if falling:
                found.append(DrawdownEpisode(
                    start=date_to_str(start),
                    trough=date_to_str(trough_date),
                    end=date_to_str(date),
                    depth=trough,
                    length=length,
                    recovery=recovery + 1,
                ))
            start = date
            falling = False
            trough = 0
            length = 0
            recovery = 0
        else:
            falling = True
            length += 1
            if depth < trough:
                trough = depth
                trough_date = date
                recovery = 0
            else:
                recovery += 1

    if falling:
        found.append(DrawdownEpisode(
            start=date_to_str(start),
            trough=date_to_str(trough_date),
            end=None,
            depth=trough,
            length=length,
            recovery=None,
        ))

    found.sort(key=lambda episode: (episode.depth, episode.start))
    return found


def calmar(annualized_return: float, deepest: float) -> float | None:
    """Annualized return relative to the deepest drawdown. None when that depth is zero."""
    if deepest == 0:
        return None
    return annualized_return / abs(deepest)

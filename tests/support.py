import pandas as pd
import pytest

from api.schemas import AnalysisInput, DateRange, FactorSeries, Point, ValueScaleMap


def close(value: float):
    return pytest.approx(value, rel=1e-6, abs=1e-12)


def filled(model):
    assert model is not None, "section is still empty"
    return model


def on(dates: list[str], values: list[float]) -> pd.Series:
    return pd.Series(values, index=pd.to_datetime(dates), dtype="float64")


def assert_series(actual: pd.Series, expected: pd.Series) -> None:
    assert isinstance(actual, pd.Series)
    pd.testing.assert_series_equal(
        actual.astype("float64"),
        expected.astype("float64"),
        check_names=False,
        check_freq=False,
        rtol=1e-9,
        atol=1e-12,
    )


def points_from(series: pd.Series) -> list[Point]:
    return [
        Point(date=pd.Timestamp(stamp).strftime("%Y-%m-%d"), value=float(value))
        for stamp, value in series.items()
    ]


def panel(
    strategy: pd.Series,
    *,
    kind: str = "returns",
    frequency: str = "daily",
    benchmark: pd.Series | None = None,
    risk_free: pd.Series | None = None,
    factors: dict[str, pd.Series] | None = None,
    strategy_scale: str = "decimal",
    benchmark_scale: str | None = None,
    risk_free_scale: str | None = None,
    factor_scales: dict[str, str] | None = None,
) -> AnalysisInput:
    factors = factors or {}
    if benchmark is not None and benchmark_scale is None:
        benchmark_scale = "decimal"
    if risk_free is not None and risk_free_scale is None:
        risk_free_scale = "decimal"
    if factor_scales is None:
        factor_scales = {name: "decimal" for name in factors}
    stamps = list(pd.to_datetime(strategy.index))
    for extra in (benchmark, risk_free, *factors.values()):
        if extra is not None:
            stamps.extend(pd.to_datetime(extra.index))
    start = min(stamps).strftime("%Y-%m-%d")
    end = max(stamps).strftime("%Y-%m-%d")
    return AnalysisInput(
        seriesKind=kind,
        frequency=frequency,
        alignment="inner",
        valueScale=ValueScaleMap(
            strategy=strategy_scale,
            benchmark=benchmark_scale,
            riskFree=risk_free_scale,
            factors=factor_scales,
        ),
        strategy=points_from(strategy),
        benchmark=None if benchmark is None else points_from(benchmark),
        riskFree=None if risk_free is None else points_from(risk_free),
        factors=[FactorSeries(name=name, points=points_from(values)) for name, values in factors.items()],
        range=DateRange(start=start, end=end),
    )

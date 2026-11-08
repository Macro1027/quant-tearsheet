import pandas as pd
import pytest

from api.schemas import Point
from quant.series import as_series, periods_per_year, prepare, to_points
from tests.support import assert_series, close, on, panel


def test_as_series_keeps_decimal_values_on_the_point_dates():
    points = [Point(date="2020-01-02", value=1.5), Point(date="2020-01-03", value=-2)]
    out = as_series(points, "decimal")
    assert list(out.to_numpy()) == close([1.5, -2.0])
    assert [str(stamp)[:10] for stamp in out.index] == ["2020-01-02", "2020-01-03"]


def test_as_series_divides_a_percent_quote_by_100():
    points = [Point(date="2020-01-02", value=1), Point(date="2020-01-03", value=12.5)]
    out = as_series(points, "percent")
    assert list(out.to_numpy()) == close([0.01, 0.125])


def test_to_points_drops_missing_values_and_sorts_by_date():
    series = pd.Series(
        [0.2, float("nan"), 0.1],
        index=pd.to_datetime(["2020-01-03", "2020-01-01", "2020-01-02"]),
        dtype="float64",
    )
    assert to_points(series) == [
        Point(date="2020-01-02", value=0.1),
        Point(date="2020-01-03", value=0.2),
    ]


@pytest.mark.parametrize(
    ("frequency", "expected"),
    [("daily", 252), ("weekly", 52), ("monthly", 12), ("quarterly", 4)],
)
def test_periods_per_year(frequency, expected):
    assert periods_per_year(frequency) == expected


def test_prepare_scales_units_and_leaves_a_price_as_a_price():
    """Percent columns become decimals. Kind stays price, so 1.0 then 1.1 is not a return."""
    prepared = prepare(
        panel(
            on(["2020-01-31", "2020-02-29"], [100, 110]),
            kind="price",
            frequency="monthly",
            benchmark=on(["2020-01-31", "2020-02-29"], [0.01, 0.02]),
            risk_free=on(["2020-01-31", "2020-02-29"], [1, 2]),
            factors={
                "Mkt": on(["2020-01-31", "2020-02-29"], [5, 10]),
                "Value": on(["2020-01-31", "2020-02-29"], [0.3, 0.4]),
            },
            strategy_scale="percent",
            benchmark_scale="decimal",
            risk_free_scale="percent",
            factor_scales={"Mkt": "percent", "Value": "decimal"},
        )
    )
    assert prepared.kind == "price"
    assert prepared.frequency == "monthly"
    assert prepared.periods_per_year == 12
    assert isinstance(prepared.strategy.index, pd.DatetimeIndex)
    assert_series(prepared.strategy, on(["2020-01-31", "2020-02-29"], [1.0, 1.1]))
    assert_series(prepared.benchmark, on(["2020-01-31", "2020-02-29"], [0.01, 0.02]))
    assert_series(prepared.risk_free, on(["2020-01-31", "2020-02-29"], [0.01, 0.02]))
    assert list(prepared.factors.columns) == ["Mkt", "Value"]
    assert_series(prepared.factors["Mkt"], on(["2020-01-31", "2020-02-29"], [0.05, 0.10]))
    assert_series(prepared.factors["Value"], on(["2020-01-31", "2020-02-29"], [0.3, 0.4]))


def test_prepare_leaves_missing_optional_series_empty():
    prepared = prepare(panel(on(["2020-01-02", "2020-01-03"], [0.01, -0.02]), frequency="daily"))
    assert prepared.benchmark is None
    assert prepared.risk_free is None
    assert prepared.factors is None
    assert prepared.periods_per_year == 252

from quant.analyze import analyze
from quant.benchmark import build_benchmark
from quant.factors import build_factors
from quant.overview import build_overview
from quant.performance import build_performance
from quant.regression import build_regression
from quant.risk import build_risk
from tests.support import on, panel


def test_analyze_returns_each_section_builder():
    sample = panel(on(["2020-01-02", "2020-01-03"], [0.01, -0.02]))
    model = analyze(sample)
    assert model.overview == build_overview(sample)
    assert model.performance == build_performance(sample)
    assert model.regression == build_regression(sample)
    assert model.benchmark == build_benchmark(sample)
    assert model.risk == build_risk(sample)
    assert model.factors == build_factors(sample)

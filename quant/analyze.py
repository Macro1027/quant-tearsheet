"""Owner entry point for tearsheet statistics.

Each build_* returns None until that section is implemented. The quantity
functions live beside the builder and raise NotImplementedError until filled in.
"""

from api.schemas import AnalysisInput, TearsheetModel

from quant.benchmark import build_benchmark
from quant.factors import build_factors
from quant.overview import build_overview
from quant.performance import build_performance
from quant.regression import build_regression
from quant.risk import build_risk


def analyze(panel: AnalysisInput) -> TearsheetModel:
    return TearsheetModel(
        overview=build_overview(panel),
        performance=build_performance(panel),
        regression=build_regression(panel),
        benchmark=build_benchmark(panel),
        risk=build_risk(panel),
        factors=build_factors(panel),
    )

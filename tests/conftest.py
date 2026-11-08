"""Shared pieces for the quant suite.

Rules the assertions use:

- A percent quote is divided by 100. A price stays a price until ``to_period_returns``.
- Periods per year are 252 daily, 52 weekly, 12 monthly, and 4 quarterly.
- A spread is the sample standard deviation, dividing by n - 1.
- Annualized volatility multiplies that spread by the square root of periods per year.
- Annualized return compounds: the product of (1 + period return), raised to
  periods-per-year / n, minus 1.
- Sharpe and the information ratio are the period mean divided by the sample
  standard deviation, times the square root of periods per year. The result is
  None when that spread is zero or undefined.
- Drawdown is the level divided by the running peak, minus 1.
- Value at risk keeps the k smallest returns, where k is at least 1 and
  otherwise the count of observations times one minus the confidence, rounded down.
  Expected shortfall is the mean of those same returns.
"""

from _pytest.outcomes import Failed

import pytest


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_call(item):
    outcome = yield
    if isinstance(outcome.exception, NotImplementedError):
        outcome.force_exception(Failed(f"{item.nodeid} is not implemented", pytrace=False))

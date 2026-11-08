"""Run the quant suite, or the tests for one module.

Examples, from the tearsheet directory:

    .venv/bin/python scripts/quanttest.py
    .venv/bin/python scripts/quanttest.py series.py
    .venv/bin/python scripts/quanttest.py quant/series.py returns
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def test_path(arg: str) -> str:
    if arg.startswith("-"):
        return arg
    name = Path(arg).name
    stem = name[:-3] if name.endswith(".py") else name
    if stem.startswith("test_"):
        path = Path(arg) if Path(arg).is_file() else ROOT / "tests" / name
    else:
        path = ROOT / "tests" / f"test_{stem}.py"
    if not path.is_file():
        raise SystemExit(f"No tests for {arg}. Expected {path.relative_to(ROOT)}.")
    return str(path)


def main() -> int:
    args = [test_path(arg) for arg in sys.argv[1:]]
    return pytest.main(args)


if __name__ == "__main__":
    raise SystemExit(main())

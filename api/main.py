"""Local analysis shell. Parses the panel, calls quant.analyze, and returns JSON."""

import math

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.schemas import AnalysisInput, TearsheetModel
from quant.analyze import analyze

app = FastAPI(title="Tearsheet analysis")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _non_finite(value: object) -> bool:
    if isinstance(value, float):
        return not math.isfinite(value)
    if isinstance(value, dict):
        return any(_non_finite(item) for item in value.values())
    if isinstance(value, list):
        return any(_non_finite(item) for item in value)
    return False


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=TearsheetModel)
def post_analyze(panel: AnalysisInput) -> TearsheetModel:
    model = analyze(panel)
    if _non_finite(model.model_dump(mode="python")):
        raise ValueError("Analysis returned a non-finite number")
    return model


@app.exception_handler(RequestValidationError)
async def invalid_body(_: Request, exc: RequestValidationError) -> JSONResponse:
    parts: list[str] = []
    for err in exc.errors():
        loc = ".".join(str(item) for item in err["loc"] if item != "body")
        message = str(err["msg"])
        parts.append(f"{loc}: {message}" if loc else message)
    summary = "; ".join(parts[:5]) or "Request did not match the analysis input."
    return JSONResponse(status_code=422, content={"message": summary})


@app.exception_handler(Exception)
async def analysis_failed(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, RequestValidationError):
        return await invalid_body(request, exc)
    text = str(exc).strip() or "Analysis failed"
    return JSONResponse(status_code=500, content={"message": text})

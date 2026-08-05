from __future__ import annotations

import asyncio
import hashlib
import importlib.metadata
import json
import math
import os
import secrets
import time
from dataclasses import asdict, is_dataclass
from typing import Any, Literal

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, SecretStr, field_validator
from ragas.embeddings.base import embedding_factory
from ragas.llms import llm_factory
from ragas.metrics.collections import (
    AnswerRelevancy,
    ContextPrecision,
    ContextRecall,
    Faithfulness,
)

WORKER_VERSION = "ragas-worker-v1"
METRIC_CONTRACT_VERSION = "ragas-collections-v1"
SUPPORTED_METRICS = (
    "faithfulness",
    "answerRelevancy",
    "contextPrecision",
    "contextRecall",
)
DEFAULT_ALLOWED_MODELS = (
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
)
ANSWER_RELEVANCY_EMBEDDING_MODEL = "text-embedding-3-small"


class EvaluatorConfig(BaseModel):
    provider: Literal["openai"] = "openai"
    model: str = "gpt-5.6-terra"
    timeout_seconds: int = Field(default=180, ge=30, le=600)


class EvaluationSample(BaseModel):
    user_input: str = Field(min_length=1, max_length=8_000)
    response: str = Field(min_length=1, max_length=30_000)
    reference: str | None = Field(default=None, max_length=30_000)
    retrieved_contexts: list[str] = Field(min_length=1, max_length=20)

    @field_validator("retrieved_contexts")
    @classmethod
    def validate_contexts(cls, contexts: list[str]) -> list[str]:
        normalized = [context.strip() for context in contexts if context.strip()]
        if not normalized:
            raise ValueError("At least one non-empty retrieved context is required.")
        if any(len(context) > 50_000 for context in normalized):
            raise ValueError("Each retrieved context must be at most 50,000 characters.")
        return normalized


class EvaluationRequest(BaseModel):
    request_id: str = Field(min_length=1, max_length=120)
    openai_api_key: SecretStr
    evaluator: EvaluatorConfig
    metrics: list[str] = Field(min_length=1, max_length=len(SUPPORTED_METRICS))
    sample: EvaluationSample

    @field_validator("metrics")
    @classmethod
    def validate_metrics(cls, metrics: list[str]) -> list[str]:
        ordered = list(dict.fromkeys(metrics))
        unsupported = [metric for metric in ordered if metric not in SUPPORTED_METRICS]
        if unsupported:
            raise ValueError(f"Unsupported Ragas metrics: {', '.join(unsupported)}")
        return ordered


class MetricDetail(BaseModel):
    score: float | None = None
    reason: str | None = None
    status: Literal["succeeded", "failed", "unavailable"]
    error: str | None = None


class EvaluationResponse(BaseModel):
    request_id: str
    status: Literal["succeeded", "partial"]
    framework: Literal["ragas"] = "ragas"
    framework_version: str
    worker_version: str = WORKER_VERSION
    metric_contract_version: str = METRIC_CONTRACT_VERSION
    evaluator: dict[str, Any]
    scores: dict[str, float]
    metric_details: dict[str, MetricDetail]
    prompt_manifest: dict[str, dict[str, Any]]
    usage: dict[str, Any]
    duration_ms: int


class UsageCollector:
    def __init__(self) -> None:
        self.requests = 0
        self.input_tokens = 0
        self.output_tokens = 0
        self.total_tokens = 0
        self.models: set[str] = set()

    async def on_response(self, response: httpx.Response) -> None:
        tracked_paths = ("/chat/completions", "/responses", "/embeddings")
        if not any(path in str(response.request.url) for path in tracked_paths):
            return
        await response.aread()
        try:
            payload = response.json()
        except (ValueError, json.JSONDecodeError):
            return
        if not isinstance(payload, dict):
            return
        self.requests += 1
        model = payload.get("model")
        if isinstance(model, str) and model:
            self.models.add(model)
        usage = payload.get("usage")
        if not isinstance(usage, dict):
            return
        input_tokens = usage.get("input_tokens", usage.get("prompt_tokens", 0))
        output_tokens = usage.get("output_tokens", usage.get("completion_tokens", 0))
        total_tokens = usage.get("total_tokens", 0)
        self.input_tokens += int(input_tokens or 0)
        self.output_tokens += int(output_tokens or 0)
        self.total_tokens += int(total_tokens or (int(input_tokens or 0) + int(output_tokens or 0)))

    def snapshot(self) -> dict[str, Any]:
        return {
            "requests": self.requests,
            "inputTokens": self.input_tokens,
            "outputTokens": self.output_tokens,
            "totalTokens": self.total_tokens,
            "resolvedModels": sorted(self.models),
        }


def allowed_models() -> set[str]:
    configured = os.getenv("RAGAS_ALLOWED_MODELS", "")
    if configured.strip():
        return {model.strip() for model in configured.split(",") if model.strip()}
    return set(DEFAULT_ALLOWED_MODELS)


def safe_json(value: Any, depth: int = 0) -> Any:
    if depth > 6:
        return "[max-depth]"
    if value is None or isinstance(value, (bool, int, float, str)):
        if isinstance(value, str) and len(value) > 20_000:
            return f"{value[:20_000]}…"
        return value
    if isinstance(value, dict):
        return {str(key): safe_json(item, depth + 1) for key, item in list(value.items())[:50]}
    if isinstance(value, (list, tuple, set)):
        return [safe_json(item, depth + 1) for item in list(value)[:50]]
    if hasattr(value, "model_dump"):
        return safe_json(value.model_dump(), depth + 1)
    if is_dataclass(value):
        return safe_json(asdict(value), depth + 1)
    return str(value)


def prompt_snapshot(metric: Any) -> dict[str, Any]:
    prompt = getattr(metric, "prompt", None)
    candidates = {"prompt": prompt} if prompt is not None else {
        name: value
        for name, value in vars(metric).items()
        if name.endswith("_prompt") and value is not None
    }
    if not candidates:
        return {"promptClass": None, "sha256": None}

    def snapshot_one(value: Any) -> dict[str, Any]:
        return {
            "promptClass": f"{value.__class__.__module__}.{value.__class__.__name__}",
            "instruction": safe_json(getattr(value, "instruction", None)),
            "language": safe_json(getattr(value, "language", None)),
            "examples": safe_json(getattr(value, "examples", None)),
        }

    snapshots = {name: snapshot_one(value) for name, value in sorted(candidates.items())}
    snapshot = next(iter(snapshots.values())) if len(snapshots) == 1 else {
        "promptClass": f"{metric.__class__.__module__}.{metric.__class__.__name__}",
        "promptCount": len(snapshots),
        "prompts": snapshots,
    }
    canonical = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return {**snapshot, "sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest()}


def build_metric(metric_name: str, llm: Any, embeddings: Any) -> Any:
    constructors = {
        "faithfulness": Faithfulness,
        "answerRelevancy": AnswerRelevancy,
        "contextPrecision": ContextPrecision,
        "contextRecall": ContextRecall,
    }
    if metric_name == "answerRelevancy":
        return constructors[metric_name](llm=llm, embeddings=embeddings)
    return constructors[metric_name](llm=llm)


def metric_arguments(metric_name: str, sample: EvaluationSample) -> dict[str, Any] | None:
    if metric_name == "faithfulness":
        return {
            "user_input": sample.user_input,
            "response": sample.response,
            "retrieved_contexts": sample.retrieved_contexts,
        }
    if metric_name == "answerRelevancy":
        return {"user_input": sample.user_input, "response": sample.response}
    if not sample.reference:
        return None
    if metric_name == "contextPrecision":
        return {
            "user_input": sample.user_input,
            "reference": sample.reference,
            "retrieved_contexts": sample.retrieved_contexts,
        }
    return {
        "user_input": sample.user_input,
        "reference": sample.reference,
        "retrieved_contexts": sample.retrieved_contexts,
    }


def sanitized_error(error: Exception) -> str:
    message = str(error).strip() or error.__class__.__name__
    return message[:2_000]


async def evaluate_payload(payload: EvaluationRequest) -> EvaluationResponse:
    if payload.evaluator.model not in allowed_models():
        raise HTTPException(status_code=400, detail="The requested evaluator model is not allowed.")

    started = time.perf_counter()
    usage = UsageCollector()
    http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(payload.evaluator.timeout_seconds),
        event_hooks={"response": [usage.on_response]},
    )
    client = AsyncOpenAI(
        api_key=payload.openai_api_key.get_secret_value(),
        http_client=http_client,
        max_retries=2,
    )
    llm = llm_factory(
        payload.evaluator.model,
        provider=payload.evaluator.provider,
        client=client,
    )
    embeddings = embedding_factory(
        provider="openai",
        model=ANSWER_RELEVANCY_EMBEDDING_MODEL,
        client=client,
    )
    scores: dict[str, float] = {}
    details: dict[str, MetricDetail] = {}
    prompts: dict[str, dict[str, Any]] = {}

    try:
        async with asyncio.timeout(payload.evaluator.timeout_seconds):
            for metric_name in payload.metrics:
                metric = build_metric(metric_name, llm, embeddings)
                prompts[metric_name] = prompt_snapshot(metric)
                arguments = metric_arguments(metric_name, payload.sample)
                if arguments is None:
                    details[metric_name] = MetricDetail(
                        status="unavailable",
                        error="A reference answer is required for this metric.",
                    )
                    continue
                try:
                    result = await metric.ascore(**arguments)
                    score = float(result.value)
                    if not math.isfinite(score):
                        raise ValueError("Ragas returned a non-finite score.")
                    normalized_score = min(1.0, max(0.0, score))
                    scores[metric_name] = round(normalized_score, 6)
                    reason = getattr(result, "reason", None)
                    details[metric_name] = MetricDetail(
                        score=scores[metric_name],
                        reason=str(reason)[:10_000] if reason else None,
                        status="succeeded",
                    )
                except Exception as error:  # Ragas providers expose several error types.
                    details[metric_name] = MetricDetail(
                        status="failed",
                        error=sanitized_error(error),
                    )
    except TimeoutError as error:
        raise HTTPException(status_code=504, detail="Ragas evaluation timed out.") from error
    finally:
        await client.close()

    if not scores:
        errors = [detail.error for detail in details.values() if detail.error]
        raise HTTPException(
            status_code=502,
            detail=errors[0] if errors else "Ragas did not return any metric scores.",
        )

    duration_ms = round((time.perf_counter() - started) * 1_000)
    return EvaluationResponse(
        request_id=payload.request_id,
        status="succeeded" if len(scores) == len(payload.metrics) else "partial",
        framework_version=importlib.metadata.version("ragas"),
        evaluator={
            "provider": payload.evaluator.provider,
            "requestedModel": payload.evaluator.model,
            "embeddingModel": ANSWER_RELEVANCY_EMBEDDING_MODEL,
            "resolvedModels": usage.snapshot()["resolvedModels"],
        },
        scores=scores,
        metric_details=details,
        prompt_manifest=prompts,
        usage=usage.snapshot(),
        duration_ms=duration_ms,
    )


security = HTTPBearer(auto_error=False)


def require_worker_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> None:
    expected = os.getenv("RAGAS_WORKER_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="Ragas worker token is not configured.")
    supplied = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else ""
    if not supplied or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


app = FastAPI(
    title="Text Splitter Ragas Worker",
    version=WORKER_VERSION,
    docs_url=None,
    redoc_url=None,
)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "framework": "ragas",
        "frameworkVersion": importlib.metadata.version("ragas"),
        "workerVersion": WORKER_VERSION,
        "metricContractVersion": METRIC_CONTRACT_VERSION,
        "supportedMetrics": list(SUPPORTED_METRICS),
        "allowedModels": sorted(allowed_models()),
    }


@app.post("/evaluate", response_model=EvaluationResponse, dependencies=[Depends(require_worker_token)])
async def evaluate(request: EvaluationRequest) -> EvaluationResponse:
    return await evaluate_payload(request)

import asyncio

import httpx

from app import main


def request(method: str, path: str, **kwargs) -> httpx.Response:
    async def send() -> httpx.Response:
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)

    return asyncio.run(send())


def test_health_reports_pinned_contract() -> None:
    response = request("GET", "/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["framework"] == "ragas"
    assert payload["frameworkVersion"] == "0.4.3"
    assert payload["metricContractVersion"] == "ragas-collections-v1"
    assert set(payload["supportedMetrics"]) == set(main.SUPPORTED_METRICS)


def test_evaluate_requires_internal_token(monkeypatch) -> None:
    monkeypatch.setenv("RAGAS_WORKER_TOKEN", "worker-test-token")
    response = request("POST", "/evaluate", json={})
    assert response.status_code == 401


def test_prompt_manifest_is_stable() -> None:
    class FakePrompt:
        instruction = "Judge the response."
        language = "english"
        examples = [{"input": "a", "output": "b"}]

    class FakeMetric:
        prompt = FakePrompt()

    first = main.prompt_snapshot(FakeMetric())
    second = main.prompt_snapshot(FakeMetric())
    assert first["sha256"] == second["sha256"]
    assert first["instruction"] == "Judge the response."


def test_reference_metrics_are_unavailable_without_reference() -> None:
    sample = main.EvaluationSample(
        user_input="Question",
        response="Answer",
        retrieved_contexts=["Context"],
    )
    assert main.metric_arguments("contextPrecision", sample) is None
    assert main.metric_arguments("contextRecall", sample) is None
    assert main.metric_arguments("faithfulness", sample) is not None


def test_evaluate_returns_scores_without_external_calls(monkeypatch) -> None:
    class FakeOpenAI:
        def __init__(self, **kwargs) -> None:
            self.kwargs = kwargs

        async def close(self) -> None:
            await self.kwargs["http_client"].aclose()

    class FakeResult:
        value = 0.875
        reason = "The answer is supported by the supplied context."

    class FakePrompt:
        instruction = "Judge support."
        language = "english"
        examples = []

    class FakeMetric:
        prompt = FakePrompt()

        async def ascore(self, **kwargs):
            assert kwargs["response"] == "Supported answer"
            return FakeResult()

    monkeypatch.setenv("RAGAS_WORKER_TOKEN", "worker-test-token")
    monkeypatch.setattr(main, "AsyncOpenAI", FakeOpenAI)
    monkeypatch.setattr(main, "llm_factory", lambda *args, **kwargs: object())
    monkeypatch.setattr(main, "embedding_factory", lambda *args, **kwargs: object())
    monkeypatch.setattr(main, "build_metric", lambda *args, **kwargs: FakeMetric())

    response = request(
        "POST",
        "/evaluate",
        headers={"Authorization": "Bearer worker-test-token"},
        json={
            "request_id": "judge-case-1",
            "openai_api_key": "sk-not-used",
            "evaluator": {"provider": "openai", "model": "gpt-5.6-terra"},
            "metrics": ["faithfulness"],
            "sample": {
                "user_input": "Question",
                "response": "Supported answer",
                "reference": "Reference answer",
                "retrieved_contexts": ["Supporting context"],
            },
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "succeeded"
    assert payload["scores"]["faithfulness"] == 0.875
    assert payload["metric_details"]["faithfulness"]["reason"]
    assert payload["usage"]["requests"] == 0

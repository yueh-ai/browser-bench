"""Tiny smoke test: judge a fake run against a mocked /verify endpoint."""

from __future__ import annotations

import httpx

from browser_bench.aggregate import aggregate
from browser_bench.judge import judge_run
from browser_bench.models import RunResult, Task
from browser_bench.subagent_prompts import prompt_for


def _task() -> Task:
    return Task(
        id="form-fill",
        title="Fill the contact form",
        scenario_n=1,
        start_url_template="http://localhost:3000/form?sid={sid}",
        verify_url_template="http://localhost:3000/verify/form-fill?sid={sid}",
        goal="Type 'Ada' into the name field and submit.",
        max_turns=15,
        predicted_winner="toss-up",
        tags=["form"],
    )


def _run(success: bool = True) -> RunResult:
    return RunResult(
        task_id="form-fill",
        tool="agent-browser",
        seed=0,
        sid="bench-form-fill-agent-browser-0",
        elapsed_ms=1000,
        turns=3,
        commands=["open http://localhost:3000/form", "snapshot -i", "fill @e3 Ada"],
        agent_verdict="success" if success else "gave_up",
        agent_notes="filled the form" if success else "could not find field",
    )


def test_judge_run_passed():
    def handler(req: httpx.Request) -> httpx.Response:
        assert req.url.path == "/verify/form-fill"
        assert req.url.params["sid"] == "bench-form-fill-agent-browser-0"
        return httpx.Response(200, json={"passed": True, "evidence": {"name": "Ada"}, "score": 1.0})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    judged = judge_run(_run(success=True), _task(), client=client)
    assert judged.server_verdict is not None
    assert judged.server_verdict.passed is True
    assert judged.success is True


def test_judge_run_failed_when_server_rejects():
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"passed": False, "evidence": {}, "score": 0.0})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    judged = judge_run(_run(success=True), _task(), client=client)
    assert judged.success is False


def test_judge_run_failed_when_agent_gave_up():
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"passed": True, "evidence": {}, "score": 1.0})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    judged = judge_run(_run(success=False), _task(), client=client)
    assert judged.success is False


def test_aggregate_minimum():
    r = _run(success=True)
    r.server_verdict = {"passed": True, "evidence": {}, "score": 1.0}  # type: ignore[assignment]
    r.success = True
    rows = aggregate([r])
    assert len(rows) == 1
    assert rows[0].success_rate == 1.0
    assert rows[0].k == 1


def test_prompt_for_substitutes_placeholders():
    task = _task()
    prompt = prompt_for("agent-browser", task, seed=0)
    assert task.goal in prompt
    assert "http://localhost:3000/form?sid=bench-form-fill-agent-browser-0" in prompt
    assert "bench-form-fill-agent-browser-0" in prompt
    assert "{task_goal}" not in prompt
    assert "{start_url}" not in prompt

"""Pydantic models + loaders for browser-bench."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

Tool = Literal["agent-browser", "playwright-cli"]
Verdict = Literal["success", "timeout", "error", "gave_up"]


class Task(BaseModel):
    id: str
    title: str
    scenario_n: int
    start_url_template: str
    verify_url_template: str
    goal: str
    max_turns: int = 15
    predicted_winner: Literal["agent-browser", "playwright-cli", "toss-up"] = "toss-up"
    tags: list[str] = Field(default_factory=list)

    def start_url(self, sid: str) -> str:
        return self.start_url_template.format(sid=sid)

    def verify_url(self, sid: str) -> str:
        return self.verify_url_template.format(sid=sid)


class ServerVerdict(BaseModel):
    passed: bool
    evidence: dict[str, Any] = Field(default_factory=dict)
    score: float = 0.0


class RunResult(BaseModel):
    task_id: str
    tool: Tool
    seed: int
    sid: str
    started_at: str | None = None
    ended_at: str | None = None
    elapsed_ms: int = 0
    turns: int = 0
    commands: list[str] = Field(default_factory=list)
    agent_verdict: Verdict = "error"
    agent_notes: str = ""
    server_verdict: ServerVerdict | None = None
    success: bool = False


class AggregateRow(BaseModel):
    task_id: str
    tool: Tool
    k: int
    success_rate: float
    mean_turns: float = 0.0
    median_turns: float = 0.0
    p90_turns: float = 0.0
    mean_elapsed_ms: float = 0.0
    distinct_commands: int = 0
    top_failure_modes: list[tuple[str, int]] = Field(default_factory=list)


def load_task(task_id: str, tasks_dir: Path | str = "tasks") -> Task:
    path = Path(tasks_dir) / f"{task_id}.json"
    return Task.model_validate_json(path.read_text())


def _load_all(d: Path | str, model: type[BaseModel]) -> list:
    p = Path(d)
    if not p.exists():
        return []
    out = []
    for f in sorted(p.glob("*.json")):
        try:
            out.append(model.model_validate_json(f.read_text()))
        except Exception:
            continue
    return out


def load_all_tasks(tasks_dir: Path | str = "tasks") -> list[Task]:
    return _load_all(tasks_dir, Task)


def load_runs(results_dir: Path | str = "results/runs") -> list[RunResult]:
    return _load_all(results_dir, RunResult)


def write_run(run: RunResult, results_dir: Path | str = "results/runs") -> Path:
    d = Path(results_dir)
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{run.task_id}-{run.tool}-{run.seed}.json"
    path.write_text(json.dumps(run.model_dump(), indent=2))
    return path

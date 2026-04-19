"""Post-hoc judging: hit the verify URL and fill in server_verdict + success."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import httpx

from .models import RunResult, ServerVerdict, Task, load_all_tasks, load_runs, write_run


def judge_run(
    run: RunResult,
    task: Task,
    *,
    client: httpx.Client | None = None,
    timeout: float = 10.0,
) -> RunResult:
    """Fetch verify endpoint and populate run.server_verdict and run.success."""
    url = task.verify_url(run.sid)
    own_client = client is None
    client = client or httpx.Client(timeout=timeout)
    try:
        resp = client.get(url)
        resp.raise_for_status()
        payload = resp.json()
        sv = ServerVerdict.model_validate(payload)
    except Exception as exc:
        sv = ServerVerdict(passed=False, evidence={"error": str(exc)}, score=0.0)
    finally:
        if own_client:
            client.close()

    run.server_verdict = sv
    run.success = run.agent_verdict == "success" and sv.passed
    return run


def post_hoc_judge(
    runs_dir: Path | str = "results/runs",
    tasks_dir: Path | str = "tasks",
    *,
    only_missing: bool = True,
) -> list[RunResult]:
    """Judge every run whose server_verdict is missing. Returns updated runs."""
    tasks = {t.id: t for t in load_all_tasks(tasks_dir)}
    runs = load_runs(runs_dir)
    updated: list[RunResult] = []
    with httpx.Client(timeout=10.0) as client:
        for run in runs:
            if only_missing and run.server_verdict is not None:
                updated.append(run)
                continue
            task = tasks.get(run.task_id)
            if task is None:
                run.server_verdict = ServerVerdict(
                    passed=False, evidence={"error": f"task {run.task_id} not found"}
                )
                run.success = False
            else:
                judge_run(run, task, client=client)
            write_run(run, runs_dir)
            updated.append(run)
    return updated


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="browser-bench-judge")
    p.add_argument("--runs-dir", default="results/runs")
    p.add_argument("--tasks-dir", default="tasks")
    p.add_argument("--all", action="store_true", help="re-judge even if server_verdict present")
    args = p.parse_args(argv)
    runs = post_hoc_judge(args.runs_dir, args.tasks_dir, only_missing=not args.all)
    passed = sum(1 for r in runs if r.success)
    print(f"judged {len(runs)} run(s); {passed} passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

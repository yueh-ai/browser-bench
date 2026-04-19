"""Render markdown reports from aggregate rows."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from .aggregate import aggregate
from .models import load_all_tasks, load_runs

TEMPLATE_DIR = Path(__file__).parent / "templates"


def render_report(
    runs_dir: Path | str = "results/runs",
    tasks_dir: Path | str = "tasks",
    out_dir: Path | str = "results",
) -> tuple[Path, Path]:
    runs = load_runs(runs_dir)
    tasks = {t.id: t for t in load_all_tasks(tasks_dir)}
    rows = aggregate(runs)

    pivot: dict[str, dict[str, object]] = {}
    for r in rows:
        pivot.setdefault(r.task_id, {})[r.tool] = r

    samples: dict[tuple[str, str], list[str]] = {}
    for r in runs:
        key = (r.task_id, r.tool)
        if key not in samples or (r.success and "#SUCCESS" not in samples[key]):
            samples[key] = (["#SUCCESS"] if r.success else []) + r.commands[:8]

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), trim_blocks=True, lstrip_blocks=True)
    ctx = {"rows": rows, "pivot": pivot, "tasks": tasks, "samples": samples, "total_runs": len(runs)}

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    report_path, summary_path = out / "report.md", out / "summary.md"
    report_path.write_text(env.get_template("report.md.j2").render(**ctx))
    summary_path.write_text(env.get_template("summary.md.j2").render(**ctx))
    return report_path, summary_path


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="browser-bench-report")
    p.add_argument("--runs-dir", default="results/runs")
    p.add_argument("--tasks-dir", default="tasks")
    p.add_argument("--out-dir", default="results")
    args = p.parse_args(argv)
    report, summary = render_report(args.runs_dir, args.tasks_dir, args.out_dir)
    print(f"wrote {report}")
    print(f"wrote {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

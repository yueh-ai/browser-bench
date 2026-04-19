"""Per-(task, tool) aggregates from RunResult lists."""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

from .models import AggregateRow, RunResult, load_runs


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    vs = sorted(values)
    k = (len(vs) - 1) * pct
    lo, hi = int(k), min(int(k) + 1, len(vs) - 1)
    if lo == hi:
        return float(vs[lo])
    return float(vs[lo] + (vs[hi] - vs[lo]) * (k - lo))


_TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z_-]{3,}")


def _cluster_failures(runs: list[RunResult], n: int = 3) -> list[tuple[str, int]]:
    """Cheap substring clustering: count frequent lowercased tokens in agent_notes of failures."""
    tokens: Counter[str] = Counter()
    for r in runs:
        if r.success:
            continue
        note = (r.agent_notes or "").lower()
        for tok in _TOKEN_RE.findall(note):
            if tok in {"the", "that", "with", "this", "from", "into", "when", "then", "task", "tool"}:
                continue
            tokens[tok] += 1
    return tokens.most_common(n)


def aggregate(runs: list[RunResult]) -> list[AggregateRow]:
    """Group runs by (task_id, tool) and compute summary stats."""
    groups: dict[tuple[str, str], list[RunResult]] = {}
    for r in runs:
        groups.setdefault((r.task_id, r.tool), []).append(r)

    rows: list[AggregateRow] = []
    for (task_id, tool), cell in sorted(groups.items()):
        k = len(cell)
        successes = sum(1 for r in cell if r.success)
        turns = [float(r.turns) for r in cell]
        elapsed = [float(r.elapsed_ms) for r in cell]
        distinct_cmds = {c.split(" ", 1)[0] for r in cell for c in r.commands if c}
        rows.append(
            AggregateRow(
                task_id=task_id,
                tool=tool,  # type: ignore[arg-type]
                k=k,
                success_rate=(successes / k) if k else 0.0,
                mean_turns=(statistics.fmean(turns) if turns else 0.0),
                median_turns=(statistics.median(turns) if turns else 0.0),
                p90_turns=_percentile(turns, 0.9),
                mean_elapsed_ms=(statistics.fmean(elapsed) if elapsed else 0.0),
                distinct_commands=len(distinct_cmds),
                top_failure_modes=_cluster_failures(cell),
            )
        )
    return rows


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="browser-bench-aggregate")
    p.add_argument("--runs-dir", default="results/runs")
    p.add_argument("--out", default="results/aggregate.json")
    args = p.parse_args(argv)
    runs = load_runs(args.runs_dir)
    rows = aggregate(runs)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps([r.model_dump() for r in rows], indent=2))
    print(f"wrote {len(rows)} aggregate row(s) to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

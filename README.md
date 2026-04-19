# browser-bench

Head-to-head benchmark comparing browser automation CLIs from an AI agent's perspective.

## What's compared

| Tool | Source | Architecture |
| --- | --- | --- |
| `agent-browser` | Vercel Labs | Rust, single binary, daemon |
| `@playwright/cli` (`playwright-cli`) | Microsoft | Node.js, subcommand CLI with `eN` refs |

Both expose accessibility-snapshot driven stepwise commands. The benchmark measures how well each supports an AI agent completing realistic multi-step web tasks.

## Methodology

- **Test site:** single Express server hosting 6 scenarios as plain HTML pages.
- **Agents:** K independent Claude subagent sessions per `(scenario, tool)` cell, each given only the task goal + tool access. No hand-written playbooks.
- **Metrics:** success rate, turn count (mean/median/p90), wall-clock, failure-mode clustering.
- **Judge:** DOM + URL + content assertions per scenario, blind to which tool produced the trace.

## Repo layout

```
browser-bench/
├── test-site/        Express app with the 6 scenario pages
├── tasks/            JSON task definitions (goal + success criteria)
├── src/              Python orchestrator (runner, executor, judge, report)
├── results/          Generated run data + final report
├── notes/            Recon notes on each tool + sandbox audit
└── scripts/          run.sh one-shot entrypoint
```

## Results (K=2 pilot)

- **Headline:** Both tools hit 100% success on all 6 scenarios; agent-browser averaged **5.8 turns/task** vs playwright-cli's **8.0**. agent-browser won 4 cells, playwright-cli won 1, 1 tied.
- **Full report:** [`results/report.md`](results/report.md) — per-scenario tables + sample command traces.
- **Narrative findings:** [`results/findings.md`](results/findings.md) — interpretation, prediction vs observation, caveats.
- **Short scoreboard:** [`results/summary.md`](results/summary.md).

## Running

See `scripts/run.sh`.

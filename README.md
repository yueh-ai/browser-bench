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

## Running

See `scripts/run.sh`.

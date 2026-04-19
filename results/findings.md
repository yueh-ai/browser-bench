# browser-bench findings (K=2)

First head-to-head, agent-driven comparison of `agent-browser` v0.26.0 (Vercel Labs) and `@playwright/cli` v0.1.8 (Microsoft) across 6 scenarios × 2 seeds = 24 live Claude subagent runs.

## Scoreboard

| Metric | agent-browser | playwright-cli |
| --- | ---: | ---: |
| Success rate (all scenarios) | **100%** (12/12) | **100%** (12/12) |
| Mean turns per task | **5.8** | 8.0 |
| Median turns | 5.5 | 7.0 |
| Cells won (fewer mean turns) | **4** | 1 |
| Cells tied | 1 | 1 |

Both tools were reliable; the separation is on **efficiency**, not correctness.

## Per-scenario turn counts

| Scenario | ab | pw | Δ | Note |
| --- | ---: | ---: | ---: | --- |
| form-fill | **3.5** | 9.0 | −61% | Batch collapsed 7 form actions into 1 turn |
| cascading-dropdowns | **9.5** | 13.5 | −30% | Batch helped but ref churn from DOM re-renders forced many snapshots either way |
| multi-tab | 4.5 | **4.0** | +12% | Both agents used `eval` + `fetch` instead of opening tabs — nullified batch |
| virtualized-scroll | **4.5** | 6.0 | −25% | Both used `eval` to scroll + read `data-secret`; ab needed one fewer inspection call |
| auth-modal | **7.0** | 10.0 | −30% | Batch chained `fill+fill+click` login; `fill+click+snapshot` for the modal |
| visual-mismatch | 5.5 | 5.5 | 0% | Identical strategy on both sides: snapshot → `eval` introspect → click Delete → snapshot → click confirm |

Bold = lower (better) mean turn count for that row.

## What the predictions got right and wrong

| Scenario | Predicted | Observed | |
| --- | --- | --- | --- |
| form-fill | agent-browser | agent-browser | ✓ |
| cascading-dropdowns | playwright-cli | agent-browser | ✗ |
| multi-tab | agent-browser | playwright-cli (thin) | ✗ |
| virtualized-scroll | toss-up | slight agent-browser | ~ |
| auth-modal | agent-browser | agent-browser | ✓ |
| visual-mismatch | toss-up | tie | ✓ |

Two misses, both informative:

- **cascading-dropdowns** was predicted to favor playwright-cli because of ref stability under DOM re-renders. In practice, *neither* tool escaped the re-render — every state/city open forced a fresh snapshot — but agent-browser could chain *open-menu + click-option + snapshot* in one batch turn, which playwright-cli couldn't.
- **multi-tab** was predicted to favor agent-browser's batch + `tab` commands. In reality, both Claude subagents skipped tab management entirely and used `eval` + `fetch` to pull all 5 product pages in 1 turn. Eval is the equalizer; tab management is not competitive with a direct HTTP fetch when a single-origin server happily serves the content.

## Observations about agent behavior (not the tools)

These findings are about how Claude agents *use* each tool, not just the tools themselves.

1. **Agents reach for `eval` early.** On 4 of 6 scenarios (multi-tab, virtualized-scroll, visual-mismatch, and sometimes auth-modal), the subagent skipped the a11y snapshot and went straight to `eval` to inspect the DOM. This cuts turns dramatically but bypasses the ref system — meaning agent-browser's `@eN` / playwright-cli's `eN` differentiators matter less than you'd think for a task-completion benchmark. They matter more for tasks where reaching the DOM requires interaction (form-fill, cascading-dropdowns).
2. **Batch's real win is the form-filling shape.** When the agent needs to issue N independent writes that don't depend on intermediate state (fill 6 fields + submit), batch saves ~N turns. When writes *depend* on each other (pick country → wait for states to load → pick state), batch saves maybe 1-2 turns per cycle and is dominated by snapshot cost.
3. **Both agents reported turn counts imperfectly.** Several subagents off-counted by 1–2 (`commands` array length ≠ `turns` field). The trace is the ground truth; treat the self-reported number as an approximation.
4. **Elapsed-ms numbers are unreliable.** Agents that actually ran `date +%s%3N` gave real numbers; others estimated or returned 0. Wall-clock comparisons in this report should be read with that caveat.

## Methodology caveats

- **K=2 is a pilot.** With 2 seeds per cell we cannot distinguish a true 5.5 mean from a true 6.0 mean; ±1 turn of variance is easy. A production benchmark would want K=10+.
- **Single driver model.** All 24 runs used the same Claude-family model (general-purpose subagent). A tool that's easy for Claude may be harder for GPT or Gemini.
- **Synthetic scenarios.** Scenarios were hand-designed to stress specific axes (batch, ref churn, virtualization, auth flow, a11y trap). Real-world pages are messier and often slower to snapshot.
- **No failure runs.** With 100% success rate at K=2, we have nothing to say about reliability under pressure. Harder scenarios (dynamic iframes, captchas, SPA routing) would likely split the tools.
- **Sandbox constraint.** `cdn.playwright.dev` and `crates.io` were blocked; we used a preinstalled Chromium 141 via `*_EXECUTABLE_PATH` overrides. Both tools supported this cleanly.
- **Agent judge isolation.** Success was determined server-side via `/verify/:task_id?sid=<sid>` endpoints the agent couldn't see. The agent's self-reported verdict matched the server verdict on all 24 runs.

## Takeaways for tool integrators

If you're picking between these two for an AI agent runtime:

- **Pick agent-browser when:** your tasks are form-heavy, you need to minimize LLM turns/tokens, or you want a single static binary + daemon.
- **Pick playwright-cli when:** you need broader browser engine support (WebKit, Firefox), you trust Playwright's selector/locator semantics from prior experience, or you already have a Playwright-based test suite you want to reuse patterns from.
- **It barely matters when:** your agent reaches for `eval` on every task. At that point you're using the browser as a scripting host, not an action interface, and both tools are thin wrappers around CDP/Playwright.

## Reproduce

```bash
cd test-site && npm install && node server.js &  # port 3000
npm install -g --prefix .npm-global agent-browser
npm install --prefix .tools @playwright/cli
export AGENT_BROWSER_EXECUTABLE_PATH=/path/to/chrome
export PLAYWRIGHT_MCP_EXECUTABLE_PATH=/path/to/chrome
uv sync
# Render prompts, feed each to a Claude subagent, collect partial JSONs, then:
uv run browser-bench-aggregate --runs-dir results/runs --out results/aggregate.json
uv run browser-bench-report --runs-dir results/runs --tasks-dir tasks --out-dir results
```

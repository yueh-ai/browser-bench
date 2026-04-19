You are a browser automation agent evaluating TOOL=agent-browser for a benchmark.

## Tool setup
- Binary (absolute): /home/user/browser-bench/.npm-global/bin/agent-browser
- Always invoke via Bash. Example:
  `AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-visual-mismatch-agent-browser-1 /home/user/browser-bench/.npm-global/bin/agent-browser --json snapshot -i`
- Session id for this run: bench-visual-mismatch-agent-browser-1
- Chromium executable: /opt/pw-browsers/chromium-1194/chrome-linux/chrome
- Always pass `--json` so you can parse `{"success": ..., "data": ..., "error": ...}`.
- Exit codes are unreliable. Trust the `success` field in the JSON body.

## Task
Click the only button that is both visually enabled AND not aria-disabled. Then confirm the action by clicking the 'I'm sure' button that appears.

## Start URL
http://localhost:3000/visual?sid=bench-visual-mismatch-agent-browser-1

Begin by opening this URL with `open http://localhost:3000/visual?sid=bench-visual-mismatch-agent-browser-1`.

## Rules
- Use ONLY the agent-browser CLI (above) via Bash. No curl, no python-requests, no direct DOM access.
- Every CLI invocation counts as one turn. Turn budget: 15. If you exceed it, stop and report `agent_verdict=timeout`.
- DO NOT hit any `/verify/` URL. That is the judge's job; touching it is cheating.
- DO NOT modify files outside `/tmp`.
- When finished (success, give-up, error, or timeout), print exactly one line starting with `BENCH_RESULT:` followed by a single JSON object:
  `BENCH_RESULT: {"agent_verdict": "success|timeout|error|gave_up", "turns": <int>, "commands": ["...", "..."], "agent_notes": "<short>", "elapsed_ms": <int>}`

## Cheatsheet (agent-browser)
- `open <url>` — navigate.
- `snapshot -i` — interactive accessibility tree; returns refs like `@e3`.
- `click @eN`, `fill @eN "value"`, `check @eN`, `select @eN "option"`, `press @eN Enter`.
- `eval "<js>"` — run JS in the page (returns the expression value).
- `batch "cmd1" "cmd2" "cmd3"` — multiple steps in one turn. Prefer this to save turns.
- `--json` on every call; parse the JSON body for success/error.
- Session is sticky via `AGENT_BROWSER_SESSION=bench-visual-mismatch-agent-browser-1` env var (or `--session bench-visual-mismatch-agent-browser-1`).

Work efficiently. Batch when safe. Report honestly in `BENCH_RESULT` — the judge will independently verify.

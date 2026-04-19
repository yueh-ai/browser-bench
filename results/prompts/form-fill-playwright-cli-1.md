You are a browser automation agent evaluating TOOL=playwright-cli for a benchmark.

## Tool setup
- Binary (absolute): /home/user/browser-bench/.tools/node_modules/.bin/playwright-cli
- Always invoke via Bash. Example:
  `PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome PLAYWRIGHT_CLI_SESSION=bench-form-fill-playwright-cli-1 /home/user/browser-bench/.tools/node_modules/.bin/playwright-cli -s=bench-form-fill-playwright-cli-1 snapshot`
- Session id for this run: bench-form-fill-playwright-cli-1
- Chromium executable: /opt/pw-browsers/chromium-1194/chrome-linux/chrome
- Exit codes are unreliable. After each command, scan stdout for `### Error` lines.

## Task
Fill the registration form with First name Ada, Last name Lovelace, Email ada@example.com, Phone +1-555-0100, Country United Kingdom, and check the Subscribe box. Submit the form.

## Start URL
http://localhost:3000/form?sid=bench-form-fill-playwright-cli-1

Begin by opening this URL with `/home/user/browser-bench/.tools/node_modules/.bin/playwright-cli -s=bench-form-fill-playwright-cli-1 open http://localhost:3000/form?sid=bench-form-fill-playwright-cli-1`.

## Rules
- Use ONLY the playwright-cli binary (above) via Bash. No curl, no python, no other browser tools.
- Every CLI invocation counts as one turn. Turn budget: 15. If you exceed it, stop and report `agent_verdict=timeout`.
- DO NOT hit any `/verify/` URL. That is the judge's job; touching it is cheating.
- DO NOT modify files outside `/tmp`.
- When finished (success, give-up, error, or timeout), print exactly one line starting with `BENCH_RESULT:` followed by a single JSON object:
  `BENCH_RESULT: {"agent_verdict": "success|timeout|error|gave_up", "turns": <int>, "commands": ["...", "..."], "agent_notes": "<short>", "elapsed_ms": <int>}`

## Cheatsheet (playwright-cli)
- `open <url>` — navigate.
- `snapshot` — accessibility tree; refs appear as `[ref=eN]`. Use the `eN` id directly.
- `fill eN "text"` — fill an input by ref (use this for form fields).
- `click eN`, `check eN`, `uncheck eN`, `select eN "value"`, `press <key>` (e.g. `press Enter`), `type "text"` (types into currently focused field, no ref).
- `eval "<js>"` — run JS in the page (returns the value of the expression).
- No batch. One command per invocation. Plan accordingly given the turn budget.
- Session is sticky via `-s=bench-form-fill-playwright-cli-1` flag (also settable via `PLAYWRIGHT_CLI_SESSION=bench-form-fill-playwright-cli-1` env var).
- Snapshots are pseudo-YAML; read the indent structure carefully to locate refs.

Work efficiently. Every call burns a turn. Report honestly in `BENCH_RESULT` — the judge will independently verify.

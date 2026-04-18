# playwright-cli recon

Target: `@playwright/cli` v0.1.8 (Microsoft, <https://github.com/microsoft/playwright-cli>,
npm `@playwright/cli`). The package `playwright-cli.js` is a thin 22-line shim that calls
`playwright-core/lib/tools/cli-client/program` — the entire CLI implementation lives in
`playwright-core`. The CLI talks to a persistent per-session daemon over a Unix socket; each
invocation is a short-lived RPC client.

## CLISurface

Global options: `--help [command]`, `--version`, `--raw` (strip page/code/snapshot headers),
`-s=<session>` (select named session; also settable via `PLAYWRIGHT_CLI_SESSION` env).

| Group | Command | Signature | Notes / Example |
|---|---|---|---|
| Core | `open` | `[url]` flags `--browser=<chromium/firefox/webkit/chrome/msedge>`, `--headed`, `--persistent`, `--profile=<path>`, `--config=<file>` | `playwright-cli open https://x --headed` |
| Core | `attach` | `[name]` flags `--extension`, `--cdp=chrome\|msedge\|<url>` | `playwright-cli attach --cdp=http://localhost:9222` |
| Core | `close` | close the browser session | |
| Core | `goto` | `<url>` | fails if browser not open |
| Core | `type` | `<text>` | types into focused element |
| Core | `click` / `dblclick` | `<target> [button]` | `target` = `eN` ref, CSS selector, or `getByRole/getByTestId(...)` |
| Core | `fill` | `<target> <text>` flag `--submit` | `fill e5 foo --submit` presses Enter after |
| Core | `drag` | `<startRef> <endRef>` | |
| Core | `hover` / `select` / `check` / `uncheck` | `<target> [val]` | `select e9 option-value` |
| Core | `upload` | `<file>` (repeatable) | |
| Core | `snapshot` | `[element]` flags `--filename=<f>`, `--depth=N` | dumps to stdout when invoked directly |
| Core | `eval` | `<func> [element]` | `eval "el=>el.id" e7` |
| Core | `dialog-accept` / `dialog-dismiss` | `[prompt]` | |
| Core | `resize` | `<w> <h>` | |
| Core | `delete-data` | — | removes user-data-dir for the session |
| Nav | `go-back`, `go-forward`, `reload` | — | |
| Keyboard | `press`, `keydown`, `keyup` | `<key>` | key names like `Enter`, `ArrowLeft` |
| Mouse | `mousemove <x> <y>`, `mousedown [btn]`, `mouseup [btn]`, `mousewheel <dx> <dy>` | | |
| Save | `screenshot` | `[target]` `--filename=<f>` | |
| Save | `pdf` | `--filename=<f>` | |
| Tabs | `tab-list`, `tab-new [url]`, `tab-close [index]`, `tab-select <index>` | | indexes are 0-based |
| Storage | `state-save [f]`, `state-load <f>` | JSON auth/cookies bundle | |
| Storage | `cookie-list/get/set/delete/clear`, `localstorage-*`, `sessionstorage-*` | | `cookie-list --domain=<d>`; `cookie-set` accepts `--httpOnly --secure --domain=` |
| Network | `route <pattern>` flags `--status`, `--body` | mock requests | `route "**/*.jpg" --status=404` |
| Network | `route-list`, `unroute [pattern]`, `network-state-set <online\|offline>` | | |
| DevTools | `console [min-level]`, `network`, `run-code [code] [--filename=f]` | | `console warning` |
| DevTools | `tracing-start/stop`, `video-start [f] / video-stop / video-chapter <title>` | | `video-chapter "X" --description= --duration=` |
| DevTools | `show`, `pause-at <location>`, `resume`, `step-over` | debugger for Playwright tests | |
| Install | `install`, `install-browser [browser]` | prerequisite setup | `install` also writes SKILL.md |
| Sessions | `list`, `close-all`, `kill-all` | | `list` shows `user-data-dir`, attach URLs |

(Confirmed by running `playwright-cli --help` in the sandbox — see InstallAttemptResult.)

## RefSystem

- Refs look like `e1`, `e2`, `e3`, ...  assigned sequentially in snapshot document order starting
  at `e1`. They are generated server-side when a snapshot is computed from the accessibility tree.
- They appear in the snapshot YAML (e.g. `- button "Click me" [ref=e3]`). The post-action output
  header after every mutating command is:
  ```
  ### Ran Playwright code
  ```js ... ```
  ### Page
  - Page URL: ...
  ### Snapshot
  - [Snapshot](.playwright-cli/page-<ts>.yml)
  ```
  i.e. every command emits a snapshot *reference* (a file path under `.playwright-cli/`), not the
  YAML body. The YAML body only lands in stdout when you explicitly run `playwright-cli snapshot`
  (or `playwright-cli --raw snapshot`). Config option `outputMode: 'file' | 'stdout'` controls
  this; the default is file-for-events, stdout-for-explicit.
- Stability: observed empirically that `e1..e5` remained identical across a `click` that did not
  alter the DOM. Refs are **not** stable across a page navigation or a DOM mutation that changes
  the accessibility tree — each snapshot can renumber, and using a stale ref yields
  `Error: Ref eN not found in the current page snapshot. Try capturing new snapshot.`
- Besides `eN`, any command accepting `<target>` also accepts a CSS selector or Playwright
  locator string (`getByRole('button', { name: 'Submit' })`, `getByTestId('x')`).

## SessionModel

- `-s=<name>` selects a named session; default is `default`. The env var
  `PLAYWRIGHT_CLI_SESSION=<name>` supplies the same value globally. Sessions are fully isolated
  (cookies, storage, IndexedDB, cache, history, tabs).
- Behind the scenes each session is backed by a long-lived daemon node process (the CLI logs
  `### Browser \`name\` opened with pid NNNNN`). Subsequent invocations are short-lived clients
  that connect to that daemon over a Unix socket.
- Profiles: by default `user-data-dir: <in-memory>` (ephemeral; state lost when daemon dies).
  With `--persistent`, the profile is written to
  `/root/.cache/ms-playwright/daemon/<workspace-hash>/ud-<session>-<browser>`
  (observed: `/root/.cache/ms-playwright/daemon/fb86d75fd7375c27/ud-persist-chrome`). The
  workspace hash keys off the cwd, so the same `-s=name` in a different project dir is a
  different profile. `--profile=<path>` overrides the directory explicitly.
- Concurrency: each session has its own daemon/socket — `playwright-cli -s=a ...` and
  `-s=b ...` can run concurrently without mutual interference. `list` enumerates them.
- Lifecycle: `close` stops the named session, `close-all` stops every daemon, `kill-all` SIGKILLs
  stale/zombie daemons, `delete-data` removes the on-disk profile for the selected session.

## BatchSupport

**No.** Each process invocation executes exactly one subcommand. Extra positionals produce
`Error: error: too many arguments: expected 2, received 3`. Shell-level `;` chaining
(`click e3 \; snapshot`) is parsed the same way — the second token is an extra positional and
errors out. The design assumes orchestration via the shell / Python driver re-exec'ing the CLI,
reusing the persistent daemon across invocations for speed.

## MultiTab

Tabs are managed with `tab-list`, `tab-new [url]`, `tab-close [index]`, `tab-select <index>`.
`tab-list` output:
```
### Result
- 0: [](data:text/html,...)
- 1: (current) [](data:text/html,...)
```
The `(current)` marker identifies the foreground tab. Every command acts on the current tab;
switch tabs with `tab-select N` before acting. New tabs inherit the session's cookies/storage.
Each session has its own independent tab set.

## InstallAttemptResult

```
$ npm install --prefix /home/user/browser-bench/.tools @playwright/cli@latest
added 3 packages in 2s

$ /home/user/browser-bench/.tools/node_modules/.bin/playwright-cli --version
0.1.8
```

`install-browser chromium` failed in this sandbox because `cdn.playwright.dev` is not in the
egress allowlist (HTTP 403 "Host not in allowlist"). A Chromium v1194 build is pre-installed at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (Chromium 141.0.7390.37). The CLI accepts
`PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` and works
against that binary — used for all the live traces in this doc.

`playwright-cli --help` output (abbreviated; full table above): groups are Core, Navigation,
Keyboard, Mouse, Save as, Tabs, Storage, Network, DevTools, Install, Browser sessions. Global
options: `--help [command]`, `--raw`, `--version`.

## SampleSnapshotOutput

`playwright-cli open "data:text/html,<h1>Hello World</h1><button id=ok>Click me</button><input placeholder=name><a href=https://example.org>link</a>"`:
```
### Browser `default` opened with pid 22824.
### Ran Playwright code
```js
await page.goto('data:text/html,...');
```
### Page
- Page URL: data:text/html,...
### Snapshot
- [Snapshot](.playwright-cli/page-2026-04-18T23-51-02-945Z.yml)
```

Contents of the referenced `.playwright-cli/page-*.yml` (and of `--raw snapshot` stdout):
```
- generic [active] [ref=e1]:
  - heading "Hello World" [level=1] [ref=e2]
  - button "Click me" [ref=e3]
  - textbox "name" [ref=e4]
  - link "link" [ref=e5] [cursor=pointer]:
    - /url: https://example.org
```
After `playwright-cli click e3` the same refs `e1..e5` remained valid (confirmed with a
follow-up `--raw snapshot`). A stale ref yields `### Error\nError: Ref eN not found in the
current page snapshot. Try capturing new snapshot.`

## PythonIntegrationNote

- Exec template: `subprocess.run([cli, "-s", session, subcommand, *args], capture_output=True,
  text=True, env={**os.environ, "PLAYWRIGHT_CLI_SESSION": session,
  "PLAYWRIGHT_MCP_EXECUTABLE_PATH": "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"})`.
  Either pass `-s=<name>` per call or set `PLAYWRIGHT_CLI_SESSION` once in the child env; the
  first `open` spawns the daemon, subsequent calls reuse it.
- Success detection: **do not rely on exit code.** Argparse errors (unknown command) return 1,
  but runtime errors from the daemon (stale ref, nav failure, etc.) still return 0. Parse stdout
  for the line `### Error` — if present, the command failed, and the next non-blank line is
  `Error: <message>`. Absence of `### Error` = success.
- Stdout structure: Markdown-ish sections prefixed with `### ` headers (`### Browser ...
  opened`, `### Ran Playwright code`, `### Page`, `### Snapshot`, `### Result`, `### Open tabs`,
  `### Error`, `### Browsers`). Code blocks fenced with triple backticks. For machine-readable
  output on commands that return a scalar (`cookie-get`, `localstorage-get`, `eval`, `snapshot`),
  pass `--raw` and capture stdout directly.
- Snapshot retrieval: after an action, parse `### Snapshot\n- [Snapshot](<path>)` to get the
  YAML path and read it, or issue a separate `playwright-cli --raw snapshot` call. Parse the
  YAML with a regex like `\[ref=(e\d+)\]` — the `pyyaml` package will not work because the
  snapshot is actually a pseudo-YAML accessibility-tree format with `[attr=value]` in-line
  annotations.
- Error detection regex: `re.search(r"^### Error\s*\nError: (.+)$", stdout, re.M)`.
- Cleanup: call `playwright-cli close-all` at the end of the benchmark run; `kill-all` as a
  fallback if a daemon hangs. Daemons persist after the Python process exits.
- Concurrency: one daemon per `(cwd, session-name, browser)` tuple. Parallel workers can use
  distinct `-s=worker-N` names and run without contention. Persistent profile dirs live under
  `/root/.cache/ms-playwright/daemon/<cwd-hash>/ud-<session>-<browser>/` — include that in
  cleanup if the benchmark uses `--persistent`.

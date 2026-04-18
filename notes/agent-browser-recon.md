# agent-browser Recon

## RepoURL

- Repo: https://github.com/vercel-labs/agent-browser
- License: Apache-2.0
- Latest release: v0.26.0 (tagged 2026-04-16)
- HEAD of `main` SHA: `717d1b09e1c841a4c0206033886a1a861e3ca5d9` (via GitHub API; commit `v0.26.0 (#1255)` by @ctate)
- npm package: `agent-browser`; site: https://agent-browser.dev
- Native Rust CLI driving Chrome over CDP (no Playwright/Puppeteer runtime dep).

## Install

```
npm install -g agent-browser     # npm (ships prebuilt binary)
brew install agent-browser       # Homebrew (macOS)
cargo install agent-browser      # Cargo source build
agent-browser install            # download Chrome for Testing (first run)
agent-browser install --with-deps # also install Linux apt deps [UNVERIFIED set]
```

npm is a thin wrapper symlinking a platform binary (`bin/agent-browser-linux-x64`); no node_modules graph. Source build: `pnpm install && pnpm build && pnpm build:native && pnpm link --global`. Rust toolchain only needed for source/cargo. Runtime dep: a **Chrome/Chromium binary** (auto-downloaded from `googlechromelabs.github.io/chrome-for-testing`, or reused from system Chrome / Puppeteer / Playwright caches — `doctor` probes all four). No Node.js needed at run time. Optional: `AI_GATEWAY_API_KEY` for the `chat` subcommand.

## CLI Surface

| Group | Subcommands |
|---|---|
| Nav | `open`, `back`, `forward`, `reload`, `close [--all]` |
| Interact | `click`, `dblclick`, `hover`, `focus`, `drag`, `scroll <dir>`, `scrollintoview`, `mouse move|down|up|wheel` |
| Input | `type`, `fill`, `press`, `keyboard type|inserttext`, `check`, `uncheck`, `select`, `upload`, `download` |
| Read | `snapshot` (a11y tree + `@eN`), `get text|html|value|attr|title|url|count|box|styles|cdp-url`, `is visible|enabled|checked` |
| Semantic find | `find role|text|label|placeholder|alt|title|testid|first|last|nth <val> <action>` |
| Wait | `wait <sel|ms>` (`--text`, `--url`, `--load networkidle`) |
| Capture | `screenshot [path]` (`--annotate`, `--full`), `pdf`, `record start|stop`, `trace`, `profiler` |
| JS / CDP | `eval <js>`, `connect <port|url>`, `--cdp`, `--auto-connect` |
| Tabs | `tab [new|list|close|<n>]` |
| Storage | `cookies [get|set|clear]`, `storage local|session` |
| Network | `network route|unroute|requests|har start|stop` |
| Settings | `set viewport|device|geo|offline|headers|credentials|media` |
| Diff | `diff snapshot|screenshot|url` |
| Debug | `console`, `errors`, `highlight`, `inspect`, `clipboard` |
| Stream | `stream enable|disable|status` (WebSocket viewport) |
| Sessions | `session`, `session list` |
| Auth vault | `auth save|login|list|show|delete` |
| State | `state save|load|list|show|clear` [UNVERIFIED — README lists it; not a top-level subcommand on v0.26.0 `--help`, likely available via `--state` flag and `auth`] |
| Confirm | `confirm <id>`, `deny <id>` |
| Chat | `chat <msg>` (single-shot), `chat` (REPL) |
| Dashboard | `dashboard start [--port N]` / `stop` (default :4848) |
| Setup | `install [--with-deps]`, `upgrade`, `doctor [--fix]`, `profiles`, `skills list|get|path` |
| Batch | `batch [--bail] "cmd1" "cmd2" ...` (args or `--json` stdin) |

Key globals: `--json`, `--headed`, `--session`, `--profile`, `--session-name`, `--state`, `--auto-connect`, `--cdp`, `--executable-path`, `--extension`, `--args`, `--proxy`, `--allowed-domains`, `--action-policy`, `--confirm-actions`, `--engine chrome|lightpanda`, `-p/--provider ios|browserbase|kernel|browseruse|browserless|agentcore`, `--max-output`, `--content-boundaries`, `--screenshot-{dir,format,quality}`, `--model`, `-v`, `-q`, `--debug`.

## RefSystem

`snapshot -i` returns an a11y tree with deterministic refs `@e1`, `@e2`, ...

```
@e1 [heading] "Log in"
@e2 [form]
  @e3 [input type="email"] placeholder="Email"
  @e4 [input type="password"] placeholder="Password"
  @e5 [button type="submit"] "Continue"
```

Then `agent-browser fill @e3 "me@x.com" && agent-browser click @e5`. Refs are re-numbered every snapshot and go stale on any page change. Snapshot inlines iframe subtrees so cross-frame clicks work without frame switching. Flags: `-i` interactive only, `-c` compact, `-d N` depth, `-s <css>` scope, `-u` href URLs, `--json`.

## BatchSupport

```
agent-browser batch "open https://ex.com" "snapshot -i" "click @e1"
agent-browser batch --bail "open https://ex.com" "click @e1"
echo '[["open","https://x.com"],["snapshot","-i"],["click","@e1"]]' | agent-browser batch --json
```

`--bail` stops on first error (default continue-all). Daemon persistence makes shell `&&` chaining effectively equivalent.

## Daemon

First command auto-spawns a local daemon over a unix socket under `$HOME/.agent-browser/` that owns Chrome; subsequent calls reuse it (sub-second RTT). Idle exit via `AGENT_BROWSER_IDLE_TIMEOUT_MS` (off by default). `doctor` enumerates active daemons; `close --all` kills every session's browser. Sessions isolated via `--session <name>` / `AGENT_BROWSER_SESSION` (separate Chrome per name). `--session-name` auto-saves/restores cookies+localStorage to `~/.agent-browser/sessions/<name>`, optionally AES-256-GCM encrypted with `AGENT_BROWSER_ENCRYPTION_KEY` (64-hex). `--state <file>` loads a Playwright-style storageState JSON. `--profile <name|path>` reuses a real Chrome profile. `auth save|login` stores/replays form credentials in an encrypted vault.

## InstallAttemptResult

Installed via npm to user-local prefix (no sudo) at `/home/user/browser-bench/.npm-global`:

```
$ npm config set prefix "$PWD/.npm-global"
$ npm install -g agent-browser
added 1 package in 4s
$ ls -l .npm-global/bin/agent-browser
agent-browser -> .../node_modules/agent-browser/bin/agent-browser-linux-x64
$ agent-browser --version
agent-browser 0.26.0
```

`--help` ran cleanly (full text captured: Core Commands, Navigation, Snapshot Options, Authentication, Batch, Chat, Dashboard, Setup, Environment, Examples, Command Chaining, iOS). Chrome download failed — sandbox blocks the CfT CDN:

```
$ agent-browser install
⚠ Linux detected. If browser fails to launch, run: agent-browser install --with-deps
Installing Chrome...
✗ Failed to fetch version info: ... invalid peer certificate: UnknownIssuer
$ agent-browser --json snapshot
{"success":false,"data":null,"error":"Auto-launch failed: Chrome not found. ..."}
```

`doctor` confirms: no Chrome present, CfT CDN unreachable (TLS cert rejection on egress). Workaround for the benchmark: install chromium via apt and set `--executable-path /usr/bin/chromium` or `AGENT_BROWSER_EXECUTABLE_PATH`, or mirror the CfT zip. Exit code was **0** even on the Chrome-not-found error in `--json` mode — rely on the JSON `success` field, not exit status.

## PythonIntegrationNote

```python
import json, os, subprocess
env = {**os.environ,
       "PATH": "/home/user/browser-bench/.npm-global/bin:" + os.environ["PATH"],
       "AGENT_BROWSER_SESSION": "bench-1",
       "AGENT_BROWSER_EXECUTABLE_PATH": "/usr/bin/chromium"}
r = subprocess.run(["agent-browser", "--json", "snapshot", "-i"],
                   capture_output=True, text=True, timeout=60, env=env)
payload = json.loads(r.stdout)   # {"success": bool, "data": ..., "error": str|None}
ok = payload.get("success") is True
```

- `--json` stdout is a single object `{"success":bool,"data":...,"error":str|None}`; `data` shape varies (snapshot = list of ref nodes, `get text` = string, `is visible` = bool).
- Without `--json`, stdout is the human `@eN [role] "name"` indented form. [UNVERIFIED — non-JSON exit-code semantics not tested; observed exit 0 under Chrome failure with `--json`.]
- stderr: `install` prints its warning banner to stderr even on success; `doctor` is stdout-only; `--debug` dumps traces to stderr.
- Concurrency: distinct `--session <name>` (or `AGENT_BROWSER_SESSION`) per Python worker — each gets its own daemon+Chrome. Reuse a name to keep cookies/tabs.
- Teardown: `agent-browser close --all`; set `AGENT_BROWSER_IDLE_TIMEOUT_MS=300000` so orphaned daemons self-exit.
- Keep prompt sizes bounded with `AGENT_BROWSER_MAX_OUTPUT` and `AGENT_BROWSER_CONTENT_BOUNDARIES`.

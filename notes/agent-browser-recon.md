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

| Group | Subcommands (one-liners) |
|---|---|
| Navigation | `open <url>`, `back`, `forward`, `reload`, `close [--all]` |
| Mouse/interact | `click`, `dblclick`, `hover`, `focus`, `drag`, `scroll <dir> [px]`, `scrollintoview`, `mouse move|down|up|wheel` |
| Input | `type`, `fill`, `press <key>`, `keyboard type|inserttext`, `check`, `uncheck`, `select`, `upload`, `download` |
| Read | `snapshot` (a11y tree + `@eN` refs), `get text|html|value|attr|title|url|count|box|styles|cdp-url`, `is visible|enabled|checked` |
| Semantic find | `find role|text|label|placeholder|alt|title|testid|first|last|nth <val> <action>` |
| Wait | `wait <sel|ms>` (flags: `--text`, `--url`, `--load networkidle`) |
| Capture | `screenshot [path]` (`--annotate`, `--full`), `pdf <path>`, `record start|stop`, `trace`, `profiler` |
| JS / CDP | `eval <js>`, `connect <port|url>`, `--cdp <port>`, `--auto-connect` |
| Tabs | `tab [new|list|close|<n>]` |
| Storage | `cookies [get|set|clear]`, `storage local|session` |
| Network | `network route|unroute|requests|har start|stop` |
| Settings | `set viewport|device|geo|offline|headers|credentials|media` |
| Diff | `diff snapshot|screenshot|url` |
| Debug | `console`, `errors`, `highlight`, `inspect`, `clipboard` |
| Streaming | `stream enable|disable|status` (WebSocket viewport streaming) |
| Sessions | `session`, `session list` |
| Auth vault | `auth save|login|list|show|delete <name>` |
| State | `state save|load|list|show|clear <path>` [UNVERIFIED — listed in README but not in `--help` top-level; may be `auth`/`--state` only on v0.26.0] |
| Confirm | `confirm <id>`, `deny <id>` |
| Chat (AI) | `chat <msg>` single-shot, `chat` REPL |
| Dashboard | `dashboard start [--port N]`, `dashboard stop` (default :4848) |
| Setup | `install [--with-deps]`, `upgrade`, `doctor [--fix]`, `profiles`, `skills list|get|path` |
| Batch | `batch [--bail] "cmd1" "cmd2" ...` (args or JSON stdin) |

Key global flags: `--json`, `--headed`, `--session <name>`, `--profile`,
`--session-name`, `--state <path>`, `--auto-connect`, `--cdp <port>`,
`--executable-path`, `--extension`, `--args`, `--proxy`, `--allowed-domains`,
`--action-policy`, `--confirm-actions`, `--engine chrome|lightpanda`,
`-p/--provider ios|browserbase|kernel|browseruse|browserless|agentcore`,
`--max-output`, `--content-boundaries`, `--screenshot-dir|format|quality`,
`--model` (for chat), `-v`, `-q`, `--debug`, `--version`.

## RefSystem

`snapshot -i` returns a compact accessibility tree with deterministic refs
`@e1`, `@e2`, ... Interact using the ref in place of a selector:

```
Page: Example - Log in
URL: https://example.com/login

@e1 [heading] "Log in"
@e2 [form]
  @e3 [input type="email"] placeholder="Email"
  @e4 [input type="password"] placeholder="Password"
  @e5 [button type="submit"] "Continue"
```

Then `agent-browser fill @e3 "me@example.com" && agent-browser click @e5`.
Refs are re-numbered on every snapshot and go stale on any page change
(nav, re-render, dialog). Snapshot refs inline iframe subtrees with frame
context so cross-frame clicks work without manual frame switching.
Snapshot flags: `-i` (interactive only), `-c` (compact), `-d N` (depth),
`-s <css>` (scope), `-u` (include href URLs), `--json`.

## BatchSupport

Single-invocation batch via args or JSON stdin:

```
agent-browser batch "open https://example.com" "snapshot -i" "click @e1"
agent-browser batch --bail "open https://ex.com" "click @e1"
echo '[["open","https://x.com"],["snapshot","-i"],["click","@e1"]]' \
  | agent-browser batch --json
```

`--bail` stops on first error; default is continue-all. The daemon makes
shell `&&` chaining equivalent in practice (browser persists across calls).

## Daemon

First command auto-spawns a local daemon over a unix socket at
`$HOME/.agent-browser/` that owns the Chrome process; subsequent commands
reuse it (hence sub-second round trips). Idle auto-shutdown via
`AGENT_BROWSER_IDLE_TIMEOUT_MS` (off by default). `doctor` lists active
daemons; `close --all` terminates every session's browser. Sessions are
isolated via `--session <name>` or `AGENT_BROWSER_SESSION`; each gets its
own Chrome. `--session-name` auto-saves/restores cookies + localStorage to
`~/.agent-browser/sessions/<name>` (optionally AES-256-GCM encrypted with
`AGENT_BROWSER_ENCRYPTION_KEY`, 64-char hex). `--state <file>` loads a
Playwright-style storageState JSON. `--profile <name|path>` reuses a real
Chrome profile for login persistence. `auth save` stores credentials in an
encrypted vault, `auth login <name>` replays them.

## InstallAttemptResult

Installed via npm to a user-local prefix (no sudo) at
`/home/user/browser-bench/.npm-global`:

```
$ npm config set prefix "$PWD/.npm-global"
$ npm install -g agent-browser
added 1 package in 4s
$ ls -l .npm-global/bin/agent-browser
agent-browser -> .../node_modules/agent-browser/bin/agent-browser-linux-x64
$ agent-browser --version
agent-browser 0.26.0
```

`--help` ran cleanly; full help text captured in transcript (Core Commands,
Navigation, Snapshot Options, Authentication, Batch, Chat, Dashboard,
Setup, Environment, Configuration, Examples, Command Chaining, iOS). Chrome
download failed in this sandbox:

```
$ agent-browser install
⚠ Linux detected. If browser fails to launch, run: agent-browser install --with-deps
Installing Chrome...
✗ Failed to fetch version info: error sending request for url
  (https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json):
  invalid peer certificate: UnknownIssuer
```

`doctor` confirms: daemon area uninitialized, no Chrome binary present,
Chrome-for-Testing CDN unreachable (TLS cert rejected by sandbox egress).
Workaround for benchmark: supply `--executable-path /path/to/chromium` or
mirror the CfT zip. Any `open` call without Chrome returns:

```
$ agent-browser --json snapshot
{"success":false,"data":null,"error":"Auto-launch failed: Chrome not found. ..."}
```

Exit code was 0 even on the Chrome-not-found error — success must be read
from the JSON `success` field, not the process exit code, when `--json` is
set.

## PythonIntegrationNote

Exec recipe:

```python
import json, subprocess
PATH = "/home/user/browser-bench/.npm-global/bin:" + os.environ["PATH"]
r = subprocess.run(
    ["agent-browser", "--json", "snapshot", "-i"],
    capture_output=True, text=True, timeout=60,
    env={**os.environ, "PATH": PATH,
         "AGENT_BROWSER_SESSION": "bench-1",
         "AGENT_BROWSER_EXECUTABLE_PATH": "/usr/bin/chromium"},
)
payload = json.loads(r.stdout)          # {"success": bool, "data": ..., "error": str|None}
ok = payload.get("success") is True
```

- With `--json`, stdout is a single JSON object
  `{"success":bool,"data":...,"error":str|None}`; `data` shape depends on
  subcommand (snapshot data is a list of ref nodes; `get text` is a string;
  `is visible` is a bool).
- Without `--json`, stdout is human-formatted text (snapshot uses the
  indented `@eN [role] "name"` form shown above). [UNVERIFIED — exit code
  semantics for non-JSON mode not tested; observed exit 0 even on Chrome
  failure with `--json`.]
- stderr quirks: `install` prints a yellow warning banner to stderr even
  on success; `doctor` writes everything to stdout. `--debug` dumps verbose
  traces to stderr.
- Concurrency: pass a distinct `--session <name>` (or
  `AGENT_BROWSER_SESSION`) per Python worker — each gets its own daemon +
  Chrome. Reuse the same session name across calls to keep cookies/tabs.
- Clean shutdown: `agent-browser close --all` at suite teardown. Consider
  `AGENT_BROWSER_IDLE_TIMEOUT_MS=300000` so abandoned daemons self-exit.
- For large pages, set `AGENT_BROWSER_MAX_OUTPUT` and
  `AGENT_BROWSER_CONTENT_BOUNDARIES` to keep outputs bounded and
  unambiguously delimited for prompt assembly.

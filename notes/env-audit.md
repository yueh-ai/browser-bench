# Environment Audit — /home/user/browser-bench

Date: 2026-04-18

| Capability | Status | Version/Notes |
|---|---|---|
| node | OK | v22.22.2 |
| npm | OK | 10.9.7 |
| npx | OK | 10.9.7 |
| python3 | OK | 3.11.15 |
| pip | OK | 24.0 (python 3.11) |
| uv | OK | 0.8.17 |
| rustc | OK | 1.94.1 (e408947bf 2026-03-25) |
| cargo | OK | 1.94.1 (29ea6fb6a 2026-03-24) |
| git | OK | 2.43.0 |
| curl | OK | 8.5.0 (OpenSSL/3.0.13) |
| jq | OK | 1.7 |
| chromium (PATH) | MISSING | `chromium: command not found` |
| chrome / google-chrome (PATH) | MISSING | `google-chrome: command not found` |
| Preinstalled Chromium | OK | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` — Chromium 141.0.7390.37 (also `chromium_headless_shell-1194`, `ffmpeg-1011`) |
| Playwright (npx --yes) | OK | Version 1.56.1 installed; 1.55.0/1.55.1/1.56.1 all tried — see below |
| `npx playwright install chromium` | BLOCKED | 403 from `https://cdn.playwright.dev` — "Host not in allowlist" |
| ANTHROPIC_API_KEY | NOT SET | `echo "${ANTHROPIC_API_KEY:+set}"` returned empty |
| Disk at /home/user | OK | 30G total, 5.4M used, 30G avail (Use 1%) |
| Write access /home/user/browser-bench | OK | Writable |
| Net HEAD registry.npmjs.org | OK | HTTP 200, 0.09s |
| Net HEAD github.com | OK | HTTP 200, 0.15s |
| Net HEAD crates.io | DEGRADED | HTTP 403, 0.25s (likely allowlist/edge rule; crate downloads may or may not work via index) |
| Net HEAD api.anthropic.com | OK* | HTTP 404 on `/` (server reachable; expected for unauthenticated root) |
| Browser launch smoke test | OK | Launched via explicit `executablePath` to `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; about:blank loaded, closed cleanly. stdout: `OK title=` |

## Raw errors

### `npx playwright install chromium`
```
Downloading Chrome for Testing 147.0.7727.49 (playwright chromium v1219) from https://cdn.playwright.dev/builds/cft/147.0.7727.49/linux64/chrome-linux64.zip
Error: Download failed: server returned code 403 body 'Host not in allowlist'.
... (retried 4x, then)
Failed to install browsers
Error: Failed to download Chrome for Testing 147.0.7727.49 (playwright chromium v1219), caused by
Error: Download failure, code=1
```

### Default launch (no executablePath) with Playwright 1.56.1
```
ERR browserType.launch: Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1219/chrome-headless-shell-linux64/chrome-headless-shell
```
Playwright 1.55.1 wanted build 1193; 1.55.0 wanted 1187; 1.56.1 wants 1219. Preinstalled is 1194 — no published Playwright tag matches exactly, so you must pass `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'` (or pin headless_shell at same path).

### crates.io HEAD
```
HTTP 403 | time 0.248702s
```

## Summary

**Green:** Node 22, Python 3.11, uv, Rust 1.94, git/curl/jq, npm registry, GitHub, Anthropic API endpoint all reachable; disk ample (30G free); workspace writable; Playwright npm package installs fine; preinstalled Chromium 141 at `/opt/pw-browsers/chromium-1194` launches headless and executes `about:blank` via explicit `executablePath`.

**Blocked:** `npx playwright install` cannot reach `cdn.playwright.dev` (403 "Host not in allowlist"); no `chromium`/`chrome`/`google-chrome` on `$PATH`; `ANTHROPIC_API_KEY` env var is unset; `crates.io` returns 403 on HEAD (registry index via GitHub still works, but direct crates.io requests may be sandboxed).

**Risky:** Any Playwright version bump drifts from the preinstalled build 1194 and will fail with default launch — harness must hard-code `executablePath` (or set `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` plus a matching Playwright pin) and avoid triggering `playwright install`; missing `ANTHROPIC_API_KEY` will break any benchmark calling the Anthropic API; the crates.io 403 may bite `cargo install`/fresh fetches later even though the toolchain is present.

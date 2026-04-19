"""Optional helpers for invoking the CLIs directly from Python (smoke tests only)."""

from __future__ import annotations

import json
import os
import subprocess

AGENT_BROWSER_BIN = "/home/user/browser-bench/.npm-global/bin/agent-browser"
PLAYWRIGHT_CLI_BIN = "/home/user/browser-bench/.tools/node_modules/.bin/playwright-cli"
CHROME_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"


def _base_env() -> dict[str, str]:
    env = os.environ.copy()
    env.setdefault("AGENT_BROWSER_EXECUTABLE_PATH", CHROME_PATH)
    env.setdefault("PLAYWRIGHT_MCP_EXECUTABLE_PATH", CHROME_PATH)
    return env


def run_agent_browser(session: str, *args: str, json_mode: bool = True, timeout: float = 30.0) -> dict:
    env = _base_env()
    env["AGENT_BROWSER_SESSION"] = session
    cmd = [AGENT_BROWSER_BIN] + (["--json"] if json_mode else []) + list(args)
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=timeout)
    if json_mode:
        try:
            return json.loads(proc.stdout.strip().splitlines()[-1])
        except Exception as exc:
            return {"success": False, "error": f"json-parse: {exc}", "stdout": proc.stdout, "stderr": proc.stderr}
    return {"success": proc.returncode == 0, "stdout": proc.stdout, "stderr": proc.stderr}


def run_playwright_cli(session: str, *args: str, timeout: float = 30.0) -> tuple[str, list[str]]:
    env = _base_env()
    env["PLAYWRIGHT_CLI_SESSION"] = session
    cmd = [PLAYWRIGHT_CLI_BIN, f"-s={session}", *args]
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=timeout)
    errors = [ln for ln in proc.stdout.splitlines() if ln.startswith("### Error")]
    return proc.stdout, errors

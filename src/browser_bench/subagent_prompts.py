"""Render Bash-ready subagent prompts from the templates in subagent-prompts/."""

from __future__ import annotations

from pathlib import Path

from .executor import AGENT_BROWSER_BIN, CHROME_PATH, PLAYWRIGHT_CLI_BIN
from .models import Task, Tool

_REPO_ROOT = Path(__file__).resolve().parents[2]
_PROMPT_DIR = _REPO_ROOT / "subagent-prompts"

_BINARIES: dict[str, str] = {
    "agent-browser": AGENT_BROWSER_BIN,
    "playwright-cli": PLAYWRIGHT_CLI_BIN,
}


def sid_for(task_id: str, tool: str, seed: int) -> str:
    return f"bench-{task_id}-{tool}-{seed}"


def prompt_for(tool: Tool, task: Task, sid: str | None = None, seed: int = 0) -> str:
    """Render a ready-to-paste subagent prompt for (tool, task, seed)."""
    if tool not in _BINARIES:
        raise ValueError(f"unknown tool: {tool!r}")
    sid = sid or sid_for(task.id, tool, seed)
    template = (_PROMPT_DIR / f"{tool}.md").read_text()
    return template.format(
        task_goal=task.goal,
        start_url=task.start_url(sid),
        sid=sid,
        max_turns=task.max_turns,
        binary_path=_BINARIES[tool],
        chrome_path=CHROME_PATH,
    )

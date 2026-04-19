#!/usr/bin/env bash
# browser-bench orchestrator entrypoint.
#
# Phase 1 (default):
#   - Start the test-site server on :3000, wait for /health.
#   - Print one Agent-tool prompt per (task, tool, seed) cell. A human / top-level
#     Claude is expected to paste each prompt into a Claude Agent invocation, then
#     drop the resulting BENCH_RESULT JSON (plus metadata) into results/runs/.
#
# Phase 2 (--finalize):
#   - Judge any unjudged runs via /verify, aggregate, render markdown reports.
#
# Flags:
#   --k N                 seeds per cell (default 3)
#   --tasks "a,b,c"       comma-separated task ids (default: all in tasks/)
#   --tool TOOL           agent-browser | playwright-cli | both  (default both)
#   --finalize            skip prompts; judge + aggregate + report
#   --no-server           don't start the test-site (assume already running)
#   --help

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

K=3
TASKS=""
TOOL="both"
FINALIZE=0
START_SERVER=1

usage() {
  sed -n '2,20p' "$0" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --k) K="$2"; shift 2 ;;
    --tasks) TASKS="$2"; shift 2 ;;
    --tool) TOOL="$2"; shift 2 ;;
    --finalize) FINALIZE=1; shift ;;
    --no-server) START_SERVER=0; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

PY="${PYTHON:-python}"
if ! "$PY" -c "import browser_bench" >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then
    PY="uv run python"
  fi
fi

SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

start_server() {
  if [[ "$START_SERVER" -ne 1 ]]; then return; fi
  if [[ ! -d "$ROOT/test-site" ]]; then
    echo "no test-site/ directory; skipping server start" >&2
    return
  fi
  echo "starting test-site on :3000..." >&2
  ( cd "$ROOT/test-site" && (npm start >"$ROOT/results/test-site.log" 2>&1 &) ) || true
  SERVER_PID=$(pgrep -f "node.*test-site" | head -n1 || true)
  for i in $(seq 1 40); do
    if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
      echo "test-site healthy" >&2
      return
    fi
    sleep 0.5
  done
  echo "warning: /health never returned 200; continuing anyway" >&2
}

if [[ "$FINALIZE" -eq 1 ]]; then
  echo "== finalize: judging runs ==" >&2
  start_server
  $PY -m browser_bench.judge --runs-dir "$ROOT/results/runs" --tasks-dir "$ROOT/tasks"
  echo "== aggregate ==" >&2
  $PY -m browser_bench.aggregate --runs-dir "$ROOT/results/runs" --out "$ROOT/results/aggregate.json"
  echo "== render reports ==" >&2
  $PY -m browser_bench.report --runs-dir "$ROOT/results/runs" --tasks-dir "$ROOT/tasks" --out-dir "$ROOT/results"
  exit 0
fi

start_server

# Determine task list
if [[ -n "$TASKS" ]]; then
  TASK_IDS="${TASKS//,/ }"
else
  TASK_IDS=""
  for f in "$ROOT"/tasks/*.json; do
    [[ -e "$f" ]] || continue
    TASK_IDS+=" $(basename "$f" .json)"
  done
fi

if [[ -z "${TASK_IDS// /}" ]]; then
  echo "no tasks found in $ROOT/tasks/. Waiting for the other agent to populate them." >&2
  exit 1
fi

# Which tools
case "$TOOL" in
  both) TOOLS="agent-browser playwright-cli" ;;
  agent-browser|playwright-cli) TOOLS="$TOOL" ;;
  *) echo "--tool must be agent-browser|playwright-cli|both" >&2; exit 2 ;;
esac

mkdir -p "$ROOT/results/runs" "$ROOT/results/prompts"

echo "" >&2
echo "===== browser-bench prompts (paste each into a Claude Agent invocation) =====" >&2
for tid in $TASK_IDS; do
  for t in $TOOLS; do
    for seed in $(seq 0 $((K - 1))); do
      out="$ROOT/results/prompts/${tid}-${t}-${seed}.md"
      $PY -c "
import sys
from browser_bench.models import load_task
from browser_bench.subagent_prompts import prompt_for
task = load_task('$tid', '$ROOT/tasks')
sys.stdout.write(prompt_for('$t', task, seed=$seed))
" > "$out"
      echo "" >&2
      echo "----- cell: $tid / $t / seed=$seed -----" >&2
      echo "prompt file: $out" >&2
      echo "expected result file: $ROOT/results/runs/${tid}-${t}-${seed}.json" >&2
    done
  done
done

echo "" >&2
echo "All prompts written to $ROOT/results/prompts/." >&2
echo "After pasting each into a Claude Agent invocation and dropping the" >&2
echo "resulting RunResult JSON into $ROOT/results/runs/, rerun with --finalize." >&2

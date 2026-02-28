#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
if [[ -x ".venv-adk/bin/python" ]]; then
  if .venv-adk/bin/python -c "import google.adk" >/dev/null 2>&1; then
    PYTHON_BIN=".venv-adk/bin/python"
  else
    echo "[run-adk-runtime] .venv-adk exists but google.adk is unavailable; falling back to $PYTHON_BIN"
  fi
fi

# Allow a single generic key to bootstrap OPENAI-compatible ADK runs.
if [[ -z "${OPENAI_API_KEY:-}" && -n "${LLM_API_KEY:-}" ]]; then
  export OPENAI_API_KEY="$LLM_API_KEY"
fi
if [[ -z "${OPENAI_API_BASE:-}" && -n "${LLM_API_BASE:-}" ]]; then
  export OPENAI_API_BASE="$LLM_API_BASE"
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "[run-adk-runtime][ERROR] OPENAI_API_KEY (or LLM_API_KEY) is required."
  exit 1
fi

AGENT_CONTEXT="${AGENT_CONTEXT:-ontology/samples/multi-agent/polymarket-agent-context-sample.json}"
EXECUTION_BUNDLE="${EXECUTION_BUNDLE:-ontology/samples/fund-execution-sample-bundle.json}"
OUTPUT_PATH="${OUTPUT_PATH:-/tmp/polymarket-runtime-output.adk.json}"
SESSION_ID="${SESSION_ID:-local_session}"
ADK_OPENAI_MODEL="${ADK_OPENAI_MODEL:-gpt-4o-mini}"
ADK_SESSION_DB_URL="${DELPHI_ADK_SESSION_DB_URL:-}"

if [[ -n "$ADK_SESSION_DB_URL" ]]; then
  "$PYTHON_BIN" scripts/ontology/run_multi_agent_runtime.py \
    --agent-context "$AGENT_CONTEXT" \
    --execution-bundle "$EXECUTION_BUNDLE" \
    --runtime-engine adk \
    --adk-provider openai \
    --adk-openai-model "$ADK_OPENAI_MODEL" \
    --session-id "$SESSION_ID" \
    --adk-session-db-url "$ADK_SESSION_DB_URL" \
    --enable-paper-trading \
    --execute-proposed-orders \
    --include-hold \
    --output "$OUTPUT_PATH" \
    --pretty \
    "$@"
else
  "$PYTHON_BIN" scripts/ontology/run_multi_agent_runtime.py \
    --agent-context "$AGENT_CONTEXT" \
    --execution-bundle "$EXECUTION_BUNDLE" \
    --runtime-engine adk \
    --adk-provider openai \
    --adk-openai-model "$ADK_OPENAI_MODEL" \
    --session-id "$SESSION_ID" \
    --enable-paper-trading \
    --execute-proposed-orders \
    --include-hold \
    --output "$OUTPUT_PATH" \
    --pretty \
    "$@"
fi

echo "[run-adk-runtime] wrote $OUTPUT_PATH"

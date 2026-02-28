# Commit Record

## Date
2026-02-28

## Commit
- Message: feat(adk): bootstrap adk runtime framework with session management and one-command launcher
- Hash: (to fill after commit)

## Scope
Upgrade Delphi runtime from ADK availability check to usable ADK orchestration with configurable provider and session management.

## What was added/changed
1. Extended `agents/run_multi_agent_runtime.py` ADK integration:
   - provider selection (`openai` / `gemini`)
   - OpenAI-compatible key/base-url configuration
   - optional persistent session store via `--adk-session-db-url`
   - runtime-session-aware ADK session naming
   - LiteLlm model wrapper auto-detection for OpenAI provider
2. Added ADK environment/bootstrap assets:
   - `requirements-adk.txt`
   - `env.adk.example`
   - `scripts/ontology/setup_adk_venv.sh`
   - `scripts/ontology/run_adk_runtime.sh`
3. Added ADK runtime smoke coverage:
   - `agents/tests/smoke_test_multi_agent_runtime_adk.py`
   - `scripts/ontology/smoke_test_multi_agent_runtime_adk.py`
   - CI hook in `scripts/ci/check_repo.sh` (skip when ADK not installed)
4. Updated runtime docs in:
   - `scripts/ontology/README.md`
   - `ontology/README.md`
   - `agents/README.md`

## Validation
1. Command run: `python3 agents/tests/smoke_test_multi_agent_runtime.py`
2. Command run: `python3 agents/tests/smoke_test_multi_agent_runtime_llm.py`
3. Command run: `python3 agents/tests/smoke_test_multi_agent_runtime_adk.py`
4. Command run: `bash scripts/ci/check_repo.sh`
5. Result: pass (ADK smoke test skipped in current environment because `google.adk` is not installed)

## Linked Issues
- Epic G runtime hardening and ADK integration

## Notes
- A direct `pip install -r requirements-adk.txt` on system Python may fail under PEP 668 managed environments; use `scripts/ontology/setup_adk_venv.sh`.

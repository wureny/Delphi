#!/usr/bin/env python3
from __future__ import annotations

import importlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    try:
        importlib.import_module("google.adk")
    except ModuleNotFoundError:
        print("[smoke-test] multi-agent adk runtime skipped (google.adk not installed)")
        return 0

    root = Path(__file__).resolve().parents[2]
    script = root / "agents/run_multi_agent_runtime.py"
    agent_context = root / "ontology/samples/multi-agent/polymarket-agent-context-sample.json"
    execution_bundle = root / "ontology/samples/fund-execution-sample-bundle.json"
    mock_responses = root / "ontology/samples/multi-agent/llm-mock-responses-sample.json"
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / "runtime-output-adk.json"
        subprocess.run(
            [
                sys.executable,
                str(script),
                "--agent-context",
                str(agent_context),
                "--execution-bundle",
                str(execution_bundle),
                "--runtime-engine",
                "adk",
                "--adk-provider",
                "openai",
                "--adk-mock-responses",
                str(mock_responses),
                "--output",
                str(output),
                "--pretty",
                "--include-hold",
            ],
            check=True,
        )
        payload = json.loads(output.read_text(encoding="utf-8"))
        if payload.get("runtime_engine") != "adk":
            raise SystemExit("expected adk runtime engine")
        runtime_context = payload.get("runtime_agent_context") or {}
        metadata = runtime_context.get("runtime_metadata") or {}
        adk_stats = metadata.get("adk") or {}
        if adk_stats.get("adk_mock_count", 0) <= 0:
            raise SystemExit("expected adk mock responses to be consumed")
        decisions = runtime_context.get("candidate_decisions") or []
        if not decisions:
            raise SystemExit("expected runtime candidate decisions")
        strategy_results = runtime_context.get("strategy_agent_results") or []
        if not strategy_results:
            raise SystemExit("expected strategy agent results")
    print("[smoke-test] multi-agent adk runtime pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

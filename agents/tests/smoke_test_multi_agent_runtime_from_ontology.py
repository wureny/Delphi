#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    runtime_script = root / "agents/run_multi_agent_runtime.py"
    ontology_bundle = root / "ontology/samples/polymarket-sample-bundle.json"
    execution_bundle = root / "ontology/samples/fund-execution-sample-bundle.json"
    mock_responses = root / "ontology/samples/multi-agent/llm-mock-responses-sample.json"
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / "runtime-from-ontology.json"
        subprocess.run(
            [
                sys.executable,
                str(runtime_script),
                "--ontology-bundle",
                str(ontology_bundle),
                "--execution-bundle",
                str(execution_bundle),
                "--runtime-engine",
                "llm",
                "--llm-mock-responses",
                str(mock_responses),
                "--include-hold",
                "--output",
                str(output),
                "--pretty",
            ],
            check=True,
        )
        payload = json.loads(output.read_text(encoding="utf-8"))
        if payload.get("source_context_kind") != "ontology_bundle":
            raise SystemExit("expected source_context_kind=ontology_bundle")
        runtime_context = payload.get("runtime_agent_context") or {}
        decisions = runtime_context.get("candidate_decisions") or []
        if not decisions:
            raise SystemExit("expected candidate_decisions in runtime context")
        runtime_metadata = runtime_context.get("runtime_metadata") or {}
        if runtime_metadata.get("engine") != "llm":
            raise SystemExit("expected runtime_metadata.engine=llm")
    print("[smoke-test] multi-agent runtime from ontology pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

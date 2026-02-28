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
        memory_path = Path(tmpdir) / "runtime-memory.json"
        out_1 = Path(tmpdir) / "runtime-memory-run1.json"
        out_2 = Path(tmpdir) / "runtime-memory-run2.json"
        base_cmd = [
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
            "--runtime-memory-path",
            str(memory_path),
            "--session-id",
            "memory_smoke_session",
            "--include-hold",
            "--pretty",
        ]
        subprocess.run(base_cmd + ["--output", str(out_1)], check=True)
        subprocess.run(base_cmd + ["--output", str(out_2)], check=True)

        second_payload = json.loads(out_2.read_text(encoding="utf-8"))
        memory_info = second_payload.get("session_memory") or {}
        if not memory_info.get("enabled"):
            raise SystemExit("expected session memory to be enabled")
        if int(memory_info.get("source_run_count", 0)) < 1:
            raise SystemExit("expected source_run_count >= 1 on second run")
        runtime_context = second_payload.get("runtime_agent_context") or {}
        runtime_metadata = runtime_context.get("runtime_metadata") or {}
        runtime_memory = runtime_metadata.get("session_memory") or {}
        if int(runtime_memory.get("updated_run_count", 0)) < 2:
            raise SystemExit("expected updated_run_count >= 2 in runtime metadata")

        memory_store = json.loads(memory_path.read_text(encoding="utf-8"))
        sessions = memory_store.get("sessions") or {}
        session = sessions.get("memory_smoke_session") or {}
        if int(session.get("run_count", 0)) < 2:
            raise SystemExit("expected persisted run_count >= 2")
        recent_decisions = session.get("recent_candidate_decisions") or []
        if not recent_decisions:
            raise SystemExit("expected recent_candidate_decisions in persisted memory")
    print("[smoke-test] runtime session memory pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

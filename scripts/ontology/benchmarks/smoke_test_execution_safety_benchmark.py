#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[3]
    runtime_script = root / "agents/run_multi_agent_runtime.py"
    benchmark_script = root / "scripts/ontology/benchmarks/evaluate_execution_safety.py"
    agent_context = root / "ontology/samples/multi-agent/polymarket-agent-context-sample.json"
    execution_bundle = root / "ontology/samples/fund-execution-sample-bundle.json"
    mock_responses = root / "ontology/samples/multi-agent/llm-mock-responses-sample.json"

    with tempfile.TemporaryDirectory() as tmpdir:
        runtime_output = Path(tmpdir) / "runtime-paper.json"
        benchmark_output = Path(tmpdir) / "execution-safety-metrics.json"
        subprocess.run(
            [
                "python3",
                str(runtime_script),
                "--agent-context",
                str(agent_context),
                "--execution-bundle",
                str(execution_bundle),
                "--runtime-engine",
                "llm",
                "--llm-mock-responses",
                str(mock_responses),
                "--include-hold",
                "--enable-paper-trading",
                "--execute-proposed-orders",
                "--output",
                str(runtime_output),
                "--pretty",
            ],
            check=True,
        )
        subprocess.run(
            [
                "python3",
                str(benchmark_script),
                "--input",
                str(runtime_output),
                "--output",
                str(benchmark_output),
                "--pretty",
            ],
            check=True,
        )
        metrics_payload = json.loads(benchmark_output.read_text(encoding="utf-8"))
        metrics = metrics_payload.get("metrics") or {}
        required = {
            "executed_orders",
            "execution_safety_violation_rate",
            "missing_audit_links",
            "missing_evidence_refs",
        }
        if missing := sorted(required - set(metrics)):
            raise SystemExit(f"missing execution safety metric fields: {missing}")
        if int(metrics.get("executed_orders", 0)) <= 0:
            raise SystemExit("expected executed_orders > 0 in benchmark smoke test")
    print("[smoke-test] execution safety benchmark pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

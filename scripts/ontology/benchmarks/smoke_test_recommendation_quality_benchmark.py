#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[3]
    runtime_script = root / "agents/run_multi_agent_runtime.py"
    benchmark_script = root / "scripts/ontology/benchmarks/evaluate_recommendation_quality.py"
    agent_context = root / "ontology/samples/multi-agent/polymarket-agent-context-sample.json"
    execution_bundle = root / "ontology/samples/fund-execution-sample-bundle.json"
    mock_responses = root / "ontology/samples/multi-agent/llm-mock-responses-sample.json"

    with tempfile.TemporaryDirectory() as tmpdir:
        runtime_output = Path(tmpdir) / "runtime-recommendation.json"
        benchmark_output = Path(tmpdir) / "recommendation-quality-metrics.json"
        subprocess.run(
            [
                sys.executable,
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
                sys.executable,
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
            "total_candidate_decisions",
            "strategy_action_alignment_rate",
            "risk_block_alignment_rate",
            "paper_execution_fill_rate",
        }
        if missing := sorted(required - set(metrics)):
            raise SystemExit(f"missing recommendation quality metric fields: {missing}")
        if int(metrics.get("total_candidate_decisions", 0)) <= 0:
            raise SystemExit("expected total_candidate_decisions > 0 in benchmark smoke test")
    print("[smoke-test] recommendation quality benchmark pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

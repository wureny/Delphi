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
    recommendation_script = root / "scripts/ontology/benchmarks/evaluate_recommendation_quality.py"
    safety_script = root / "scripts/ontology/benchmarks/evaluate_execution_safety.py"
    trend_script = root / "scripts/ontology/benchmarks/generate_benchmark_trend_report.py"
    agent_context = root / "ontology/samples/multi-agent/polymarket-agent-context-sample.json"
    execution_bundle = root / "ontology/samples/fund-execution-sample-bundle.json"
    mock_responses = root / "ontology/samples/multi-agent/llm-mock-responses-sample.json"

    with tempfile.TemporaryDirectory() as tmpdir:
        runtime_output = Path(tmpdir) / "runtime-paper.json"
        recommendation_output = Path(tmpdir) / "recommendation-quality.json"
        safety_output = Path(tmpdir) / "execution-safety.json"
        trend_output_1 = Path(tmpdir) / "benchmark-trend-1.json"
        trend_output_2 = Path(tmpdir) / "benchmark-trend-2.json"
        history_output = Path(tmpdir) / "benchmark-history.json"

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
                str(recommendation_script),
                "--input",
                str(runtime_output),
                "--output",
                str(recommendation_output),
                "--pretty",
            ],
            check=True,
        )
        subprocess.run(
            [
                sys.executable,
                str(safety_script),
                "--input",
                str(runtime_output),
                "--output",
                str(safety_output),
                "--pretty",
            ],
            check=True,
        )
        trend_base_cmd = [
            sys.executable,
            str(trend_script),
            "--recommendation-quality",
            str(recommendation_output),
            "--execution-safety",
            str(safety_output),
            "--history",
            str(history_output),
            "--pretty",
        ]
        subprocess.run(trend_base_cmd + ["--output", str(trend_output_1)], check=True)
        subprocess.run(trend_base_cmd + ["--output", str(trend_output_2)], check=True)

        report = json.loads(trend_output_2.read_text(encoding="utf-8"))
        trend = report.get("trend") or {}
        if not trend.get("has_previous"):
            raise SystemExit("expected has_previous=true on second trend report run")
        if int(trend.get("history_size", 0)) < 2:
            raise SystemExit("expected history_size >= 2 on second trend report run")
        latest = report.get("latest") or {}
        if "recommendation_quality" not in latest or "execution_safety" not in latest:
            raise SystemExit("trend report missing latest recommendation/execution metrics")
    print("[smoke-test] benchmark trend report pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

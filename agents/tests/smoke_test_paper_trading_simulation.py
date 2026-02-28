#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    runtime_script = root / "agents/run_multi_agent_runtime.py"
    agent_context = root / "ontology/samples/multi-agent/polymarket-agent-context-sample.json"
    execution_bundle = root / "ontology/samples/fund-execution-sample-bundle.json"
    mock_responses = root / "ontology/samples/multi-agent/llm-mock-responses-sample.json"
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / "runtime-paper-trading.json"
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
                str(output),
                "--pretty",
            ],
            check=True,
        )
        payload = json.loads(output.read_text(encoding="utf-8"))
        paper = payload.get("paper_trading_payload")
        if not isinstance(paper, dict):
            raise SystemExit("expected paper_trading_payload in runtime output")
        executions = paper.get("execution_records") or []
        if not executions:
            raise SystemExit("expected at least one simulated execution")
        audit_trail = paper.get("execution_audit_trail") or []
        if not audit_trail:
            raise SystemExit("expected execution audit trail entries")
        pnl_summary = paper.get("pnl_summary") or {}
        if "net_realized_pnl_usd" not in pnl_summary:
            raise SystemExit("missing net_realized_pnl_usd in pnl_summary")
        updated_bundle = paper.get("updated_execution_bundle") or {}
        if not updated_bundle.get("positions"):
            raise SystemExit("expected positions in updated execution bundle")
    print("[smoke-test] paper trading simulation pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

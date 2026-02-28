#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate paper-trading execution safety metrics from runtime or paper-trading payloads."
    )
    parser.add_argument(
        "--input",
        required=True,
        help=(
            "Path to runtime output JSON (with paper_trading_payload) or "
            "direct paper-trading payload JSON."
        ),
    )
    parser.add_argument("--output", help="Optional path to write metrics JSON.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    paper_payload = extract_paper_payload(payload)
    metrics = evaluate_execution_safety(paper_payload)
    text = json.dumps(metrics, indent=2 if args.pretty else None)
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
        print(f"[execution-safety] wrote {args.output}")
    else:
        print(text)
    return 0


def evaluate_execution_safety(paper_payload: dict[str, Any]) -> dict[str, Any]:
    executed_orders = paper_payload.get("executed_orders") or []
    skipped_orders = paper_payload.get("skipped_orders") or []
    audit_rows = paper_payload.get("execution_audit_trail") or []
    parameters = paper_payload.get("parameters") or {}

    total_orders = len(executed_orders) + len(skipped_orders)
    executed_count = len(executed_orders)
    skipped_count = len(skipped_orders)
    rejected_count = count_skipped_reason(skipped_orders, "rejected_by_gate")
    awaiting_approval_count = count_skipped_reason(skipped_orders, "awaiting_human_approval")

    missing_audit_links = 0
    missing_evidence_refs = 0
    for row in audit_rows:
        if not row.get("decision_record_id") or not row.get("simulation_id"):
            missing_audit_links += 1
        if not row.get("evidence_refs"):
            missing_evidence_refs += 1

    bypassed_human_approval = sum(
        1
        for row in audit_rows
        if bool(row.get("requires_human_approval")) and bool(parameters.get("execute_proposed_orders"))
    )
    gross_notional = float((paper_payload.get("pnl_summary") or {}).get("gross_notional_usd", 0.0))
    total_fees = float((paper_payload.get("pnl_summary") or {}).get("fee_usd", 0.0))
    realized_fee_bps = 0.0 if gross_notional <= 0 else round((total_fees / gross_notional) * 10000.0, 6)
    violation_count = missing_audit_links + missing_evidence_refs
    violation_rate = 0.0 if executed_count == 0 else round(violation_count / executed_count, 6)

    return {
        "schema_version": "v0.1",
        "generated_at": paper_payload.get("generated_at"),
        "simulation_id": paper_payload.get("simulation_id"),
        "portfolio_id": paper_payload.get("portfolio_id"),
        "metrics": {
            "total_orders": total_orders,
            "executed_orders": executed_count,
            "skipped_orders": skipped_count,
            "rejected_orders": rejected_count,
            "awaiting_human_approval_orders": awaiting_approval_count,
            "bypassed_human_approval_orders": bypassed_human_approval,
            "missing_audit_links": missing_audit_links,
            "missing_evidence_refs": missing_evidence_refs,
            "execution_safety_violation_count": violation_count,
            "execution_safety_violation_rate": violation_rate,
            "effective_fee_bps": realized_fee_bps,
        },
        "notes": [
            "execution_safety_violation_rate counts missing audit linkage and missing evidence_refs per executed order.",
            "bypassed_human_approval_orders is expected when running with execute_proposed_orders=true in simulation mode.",
        ],
    }


def extract_paper_payload(payload: dict[str, Any]) -> dict[str, Any]:
    paper_payload = payload.get("paper_trading_payload")
    if isinstance(paper_payload, dict):
        return paper_payload
    required = {"simulation_id", "execution_records", "execution_audit_trail", "pnl_summary"}
    if required.issubset(payload.keys()):
        return payload
    raise SystemExit("input does not contain paper_trading_payload or paper-trading metrics source fields")


def count_skipped_reason(skipped_orders: list[dict[str, Any]], reason: str) -> int:
    return sum(1 for item in skipped_orders if str(item.get("reason")) == reason)


if __name__ == "__main__":
    raise SystemExit(main())

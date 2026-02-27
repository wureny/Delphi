#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Map multi-agent candidate decisions into execution-domain DecisionRecord objects.")
    parser.add_argument("--agent-context", required=True, help="Path to the multi-agent context JSON.")
    parser.add_argument("--output", required=True, help="Path to write the decision records JSON.")
    parser.add_argument("--include-hold", action="store_true", help="Keep hold decisions. By default only actionable decisions are emitted.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    agent_context = json.loads(Path(args.agent_context).read_text(encoding="utf-8"))
    payload = build_decision_records(agent_context, include_hold=args.include_hold)
    indent = 2 if args.pretty else None
    Path(args.output).write_text(json.dumps(payload, indent=indent) + "\n", encoding="utf-8")
    print(f"[decision-records] wrote {args.output} count={len(payload['decision_records'])}")
    return 0


def build_decision_records(agent_context: dict[str, Any], include_hold: bool = False) -> dict[str, Any]:
    risk_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in agent_context.get("risk_agent_packets", [])
    }
    strategy_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in agent_context.get("strategy_agent_packets", [])
    }
    records = []
    for candidate in agent_context.get("candidate_decisions", []):
        if candidate.get("proposed_action") == "hold" and not include_hold:
            continue
        key = (candidate["market_id"], candidate["outcome_id"])
        risk_packet = risk_by_key.get(key, {})
        strategy_packet = strategy_by_key.get(key, {})
        record = {
            "id": candidate["decision_id"],
            "market_id": candidate["market_id"],
            "outcome_id": candidate["outcome_id"],
            "thesis": build_thesis(candidate, strategy_packet, risk_packet),
            "confidence": float(candidate["confidence"]),
            "evidence_refs": list(candidate.get("evidence_refs", [])),
            "proposed_action": normalize_action(candidate["proposed_action"]),
            "created_at": agent_context.get("generated_at") or utc_iso8601(),
            "created_by_agent": candidate.get("created_by_agent", "strategy_agent"),
        }
        records.append(record)
    return {
        "schema_version": "v0.1",
        "generated_at": utc_iso8601(),
        "source_agent_context_generated_at": agent_context.get("generated_at"),
        "decision_records": records,
    }


def build_thesis(candidate: dict[str, Any], strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> str:
    parts = [str(candidate.get("thesis_summary") or "").strip()]
    robust = strategy_packet.get("robust_probability")
    edge = strategy_packet.get("probability_edge")
    recommendation = strategy_packet.get("strategy_recommendation")
    if robust is not None:
        parts.append(f"robust_probability={robust}")
    if edge is not None:
        parts.append(f"edge={edge}")
    if recommendation:
        parts.append(f"strategy={recommendation}")
    risk_gate = risk_packet.get("risk_gate") or candidate.get("risk_gate")
    if risk_gate:
        parts.append(f"risk_gate={risk_gate}")
    risk_reasons = risk_packet.get("risk_reasons") or []
    if risk_reasons:
        parts.append("risk_reasons=" + ",".join(risk_reasons))
    return "; ".join(part for part in parts if part)


def normalize_action(value: Any) -> str:
    action = str(value or "hold").strip().lower()
    if action in {"buy", "sell", "hold", "reduce", "exit"}:
        return action
    return "hold"


def utc_iso8601() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())

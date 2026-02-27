#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import importlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__:
    from .build_decision_records import build_decision_records
    from .build_order_proposals import build_order_proposals
    from .evaluate_risk_policy_gate import evaluate_gate
else:
    from build_decision_records import build_decision_records
    from build_order_proposals import build_order_proposals
    from evaluate_risk_policy_gate import evaluate_gate


DEFAULT_PORTFOLIO_ID = "pf_main"
DEFAULT_ORDER_TYPE = "limit"
DEFAULT_RUNTIME_ENGINE = "heuristic"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a minimal multi-agent runtime skeleton over multi-agent context and "
            "bridge into DecisionRecord -> RiskPolicy gate -> Order proposal."
        )
    )
    parser.add_argument("--agent-context", required=True, help="Path to the multi-agent context JSON.")
    parser.add_argument("--execution-bundle", required=True, help="Path to fund execution bundle JSON.")
    parser.add_argument("--output", required=True, help="Path to write runtime output JSON.")
    parser.add_argument(
        "--runtime-engine",
        choices=["heuristic", "adk"],
        default=DEFAULT_RUNTIME_ENGINE,
        help="Runtime orchestrator backend. adk mode is an optional adapter layer.",
    )
    parser.add_argument("--session-id", default="local_session", help="Runtime session id.")
    parser.add_argument("--portfolio-id", default=DEFAULT_PORTFOLIO_ID, help="Portfolio id for risk/order evaluation.")
    parser.add_argument("--policy-id", default=None, help="Optional risk policy id override.")
    parser.add_argument("--default-order-size-usd", type=float, default=500.0, help="Default notional per proposed action.")
    parser.add_argument("--include-hold", action="store_true", help="Keep hold decisions through DecisionRecord/RiskGate.")
    parser.add_argument("--order-type", choices=["market", "limit"], default=DEFAULT_ORDER_TYPE, help="Order type for proposals.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print output JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_context = json.loads(Path(args.agent_context).read_text(encoding="utf-8"))
    execution_bundle = json.loads(Path(args.execution_bundle).read_text(encoding="utf-8"))
    result = run_runtime(
        agent_context=source_context,
        execution_bundle=execution_bundle,
        runtime_engine=args.runtime_engine,
        session_id=args.session_id,
        portfolio_id=args.portfolio_id,
        policy_id=args.policy_id,
        default_order_size_usd=args.default_order_size_usd,
        include_hold=args.include_hold,
        order_type=args.order_type,
    )
    indent = 2 if args.pretty else None
    Path(args.output).write_text(json.dumps(result, indent=indent) + "\n", encoding="utf-8")
    print(
        f"[multi-agent-runtime] wrote {args.output} "
        f"engine={result['runtime_engine']} "
        f"decisions={len(result['runtime_agent_context']['candidate_decisions'])} "
        f"orders={len(result['order_proposals_payload']['orders'])}"
    )
    return 0


def run_runtime(
    agent_context: dict[str, Any],
    execution_bundle: dict[str, Any],
    runtime_engine: str,
    session_id: str,
    portfolio_id: str,
    policy_id: str | None,
    default_order_size_usd: float,
    include_hold: bool,
    order_type: str,
) -> dict[str, Any]:
    ensure_runtime_engine(runtime_engine)
    runtime_context, trace = build_runtime_agent_context(
        source_context=agent_context,
        runtime_engine=runtime_engine,
        session_id=session_id,
    )
    decision_records_payload = build_decision_records(runtime_context, include_hold=include_hold)
    risk_gate_payload = evaluate_gate(
        agent_context=runtime_context,
        execution_bundle=execution_bundle,
        portfolio_id=portfolio_id,
        policy_id=policy_id,
        default_order_size_usd=default_order_size_usd,
        include_hold=include_hold,
    )
    order_proposals_payload = build_order_proposals(
        decision_payload=decision_records_payload,
        gate_payload=risk_gate_payload,
        execution_bundle=execution_bundle,
        portfolio_id=portfolio_id,
        order_type=order_type,
    )
    return {
        "schema_version": "v0.1",
        "generated_at": utc_iso8601(),
        "runtime_engine": runtime_engine,
        "session_id": session_id,
        "source_agent_context_generated_at": agent_context.get("generated_at"),
        "orchestration_trace": trace,
        "runtime_agent_context": runtime_context,
        "decision_records_payload": decision_records_payload,
        "risk_gate_payload": risk_gate_payload,
        "order_proposals_payload": order_proposals_payload,
    }


def ensure_runtime_engine(runtime_engine: str) -> None:
    if runtime_engine != "adk":
        return
    try:
        importlib.import_module("google.adk")
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "runtime-engine=adk requested but google-adk is not installed. "
            "Install ADK dependencies first, or run with --runtime-engine heuristic."
        ) from exc


def build_runtime_agent_context(
    source_context: dict[str, Any],
    runtime_engine: str,
    session_id: str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    strategy_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in source_context.get("strategy_agent_packets", [])
    }
    risk_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in source_context.get("risk_agent_packets", [])
    }
    audit_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in source_context.get("audit_agent_packets", [])
    }
    base_candidate_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in source_context.get("candidate_decisions", [])
    }

    research_outputs = []
    for packet in source_context.get("research_agent_packets", []):
        research_outputs.append(
            {
                "agent": "research_agent",
                "event_id": packet["event_id"],
                "market_id": packet["market_id"],
                "summary": (
                    f"category={packet.get('category')}, trading_state={packet.get('trading_state')}, "
                    f"news_count={len(packet.get('related_news_signals', []))}, outcomes={len(packet.get('outcomes', []))}"
                ),
            }
        )

    strategy_outputs = []
    risk_outputs = []
    audit_outputs = []
    candidate_decisions = []
    for key in sorted(strategy_by_key):
        strategy_packet = strategy_by_key[key]
        risk_packet = risk_by_key.get(key, {})
        audit_packet = audit_by_key.get(key, {})
        base_candidate = base_candidate_by_key.get(key, {})
        strategy_recommendation = str(strategy_packet.get("strategy_recommendation", "hold"))
        proposed_action = recommendation_to_action(strategy_recommendation, risk_packet.get("risk_gate"))
        confidence = decision_confidence(strategy_packet, risk_packet)
        decision_id = str(base_candidate.get("decision_id") or f"draft_{strategy_packet['outcome_id']}")
        event_id = str(base_candidate.get("event_id") or strategy_packet.get("event_id", ""))
        evidence_refs = list(base_candidate.get("evidence_refs") or audit_packet.get("evidence_refs") or [])

        strategy_outputs.append(
            {
                "agent": "strategy_agent",
                "market_id": strategy_packet["market_id"],
                "outcome_id": strategy_packet["outcome_id"],
                "strategy_recommendation": strategy_recommendation,
                "proposed_action": proposed_action,
                "probability_edge": strategy_packet.get("probability_edge"),
                "robust_probability": strategy_packet.get("robust_probability"),
            }
        )
        risk_outputs.append(
            {
                "agent": "risk_agent",
                "market_id": strategy_packet["market_id"],
                "outcome_id": strategy_packet["outcome_id"],
                "risk_gate": risk_packet.get("risk_gate", "caution"),
                "risk_reasons": list(risk_packet.get("risk_reasons") or ["runtime_risk_packet_missing"]),
            }
        )
        audit_outputs.append(
            {
                "agent": "audit_agent",
                "market_id": strategy_packet["market_id"],
                "outcome_id": strategy_packet["outcome_id"],
                "evidence_refs": evidence_refs,
                "trace_summary": (
                    f"display_source={audit_packet.get('display_price_source')}, "
                    f"signal_tags={','.join(audit_packet.get('explanatory_tags', []))}"
                ),
            }
        )
        candidate_decisions.append(
            {
                "decision_id": decision_id,
                "event_id": event_id,
                "market_id": strategy_packet["market_id"],
                "outcome_id": strategy_packet["outcome_id"],
                "proposed_action": proposed_action,
                "confidence": confidence,
                "thesis_summary": thesis_summary(strategy_packet, risk_packet),
                "evidence_refs": evidence_refs,
                "created_by_agent": f"strategy_agent_{runtime_engine}_v0",
                "requires_risk_review": risk_packet.get("risk_gate") != "allow",
                "risk_gate": risk_packet.get("risk_gate", "caution"),
            }
        )

    runtime_context = copy.deepcopy(source_context)
    runtime_context["generated_at"] = utc_iso8601()
    runtime_context["source_agent_context_generated_at"] = source_context.get("generated_at")
    runtime_context["runtime_metadata"] = {
        "engine": runtime_engine,
        "session_id": session_id,
        "schema_version": "v0.1",
    }
    runtime_context["research_agent_results"] = research_outputs
    runtime_context["strategy_agent_results"] = strategy_outputs
    runtime_context["risk_agent_results"] = risk_outputs
    runtime_context["audit_agent_results"] = audit_outputs
    runtime_context["candidate_decisions"] = candidate_decisions

    trace = [
        {"step": "research_agent", "engine": runtime_engine, "inputs": len(source_context.get("research_agent_packets", [])), "outputs": len(research_outputs), "status": "ok"},
        {"step": "strategy_agent", "engine": runtime_engine, "inputs": len(source_context.get("strategy_agent_packets", [])), "outputs": len(strategy_outputs), "status": "ok"},
        {"step": "risk_agent", "engine": runtime_engine, "inputs": len(source_context.get("risk_agent_packets", [])), "outputs": len(risk_outputs), "status": "ok"},
        {"step": "audit_agent", "engine": runtime_engine, "inputs": len(source_context.get("audit_agent_packets", [])), "outputs": len(audit_outputs), "status": "ok"},
    ]
    return runtime_context, trace


def recommendation_to_action(strategy_recommendation: str, risk_gate: str | None) -> str:
    if risk_gate == "block":
        return "hold"
    mapping = {
        "consider_buy": "buy",
        "consider_sell": "sell",
        "hold": "hold",
        "monitor": "hold",
    }
    return mapping.get(str(strategy_recommendation).strip().lower(), "hold")


def decision_confidence(strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> float:
    edge = abs(float(strategy_packet.get("probability_edge", 0.0)))
    book = float(strategy_packet.get("book_reliability_score", 0.0))
    trade = float(strategy_packet.get("trade_reliability_score", 0.0))
    risk = float(strategy_packet.get("manipulation_risk_score", 0.0))
    score = min(1.0, edge * 5.0 + 0.4 * book + 0.3 * trade - 0.5 * risk)
    if risk_packet.get("risk_gate") == "block":
        score *= 0.25
    elif risk_packet.get("risk_gate") == "caution":
        score *= 0.6
    return round(max(0.0, score), 6)


def thesis_summary(strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> str:
    return (
        f"Runtime strategy={strategy_packet.get('strategy_recommendation')}, "
        f"robust_probability={strategy_packet.get('robust_probability')}, "
        f"edge={strategy_packet.get('probability_edge')}, "
        f"risk_gate={risk_packet.get('risk_gate', 'caution')}."
    )


def utc_iso8601() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__:
    from .contracts import validate_agent_context, validate_execution_bundle
else:
    from contracts import validate_agent_context, validate_execution_bundle


DEFAULT_PORTFOLIO_ID = "pf_main"
DEFAULT_POLICY_ID = "rp_conservative"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate candidate decisions against a simple RiskPolicy gate.")
    parser.add_argument("--agent-context", required=True, help="Path to the multi-agent context JSON.")
    parser.add_argument("--execution-bundle", required=True, help="Path to the current fund execution bundle JSON.")
    parser.add_argument("--portfolio-id", default=DEFAULT_PORTFOLIO_ID, help="Portfolio account id to evaluate against.")
    parser.add_argument("--policy-id", default=None, help="Risk policy id override. Defaults to the portfolio's policy.")
    parser.add_argument("--default-order-size-usd", type=float, default=500.0, help="Default notional per proposed action.")
    parser.add_argument("--include-hold", action="store_true", help="Include hold decisions in the gate report.")
    parser.add_argument(
        "--skip-contract-validation",
        action="store_true",
        help="Skip agent-context and execution-bundle contract validation.",
    )
    parser.add_argument("--output", required=True, help="Path to write the gate report JSON.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    agent_context = json.loads(Path(args.agent_context).read_text(encoding="utf-8"))
    execution_bundle = json.loads(Path(args.execution_bundle).read_text(encoding="utf-8"))
    if not args.skip_contract_validation:
        validate_agent_context(agent_context)
        validate_execution_bundle(execution_bundle)
    report = evaluate_gate(
        agent_context=agent_context,
        execution_bundle=execution_bundle,
        portfolio_id=args.portfolio_id,
        policy_id=args.policy_id,
        default_order_size_usd=args.default_order_size_usd,
        include_hold=args.include_hold,
    )
    indent = 2 if args.pretty else None
    Path(args.output).write_text(json.dumps(report, indent=indent) + "\n", encoding="utf-8")
    print(f"[risk-gate] wrote {args.output} results={len(report['gate_results'])}")
    return 0


def evaluate_gate(
    agent_context: dict[str, Any],
    execution_bundle: dict[str, Any],
    portfolio_id: str,
    policy_id: str | None,
    default_order_size_usd: float,
    include_hold: bool,
) -> dict[str, Any]:
    portfolio = find_portfolio(execution_bundle, portfolio_id)
    selected_policy_id = policy_id or portfolio["risk_policy_id"]
    risk_policy = find_risk_policy(execution_bundle, selected_policy_id)
    strategy_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in agent_context.get("strategy_agent_packets", [])
    }
    risk_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in agent_context.get("risk_agent_packets", [])
    }
    current_position_notional_by_market = current_position_notional(execution_bundle, portfolio_id)
    daily_notional = current_daily_notional(execution_bundle, portfolio_id)

    gate_results = []
    for candidate in agent_context.get("candidate_decisions", []):
        if candidate.get("proposed_action") == "hold" and not include_hold:
            continue
        key = (candidate["market_id"], candidate["outcome_id"])
        strategy_packet = strategy_by_key.get(key, {})
        upstream_risk = risk_by_key.get(key, {})
        price_proxy = choose_price_proxy(strategy_packet)
        quantity = 0.0 if price_proxy <= 0 else default_order_size_usd / price_proxy
        market_notional_limit = float(risk_policy["max_daily_notional_usd"]) * float(risk_policy["max_market_exposure_pct"])
        projected_market_notional = current_position_notional_by_market.get(candidate["market_id"], 0.0) + default_order_size_usd
        projected_daily_notional = daily_notional + default_order_size_usd
        gate, reasons = rule_gate(
            candidate=candidate,
            upstream_risk=upstream_risk,
            risk_policy=risk_policy,
            projected_market_notional=projected_market_notional,
            projected_daily_notional=projected_daily_notional,
            market_notional_limit=market_notional_limit,
        )
        gate_results.append(
            {
                "decision_id": candidate["decision_id"],
                "market_id": candidate["market_id"],
                "outcome_id": candidate["outcome_id"],
                "portfolio_id": portfolio_id,
                "risk_policy_id": risk_policy["id"],
                "proposed_action": candidate["proposed_action"],
                "price_proxy": round(price_proxy, 6),
                "proposed_notional_usd": round(default_order_size_usd, 6),
                "proposed_quantity": round(quantity, 6),
                "projected_market_notional_usd": round(projected_market_notional, 6),
                "projected_daily_notional_usd": round(projected_daily_notional, 6),
                "market_notional_limit_usd": round(market_notional_limit, 6),
                "decision_confidence": candidate["confidence"],
                "upstream_risk_gate": upstream_risk.get("risk_gate"),
                "gate": gate,
                "requires_human_approval": bool(risk_policy["requires_human_approval"]) or gate == "review",
                "reasons": reasons,
            }
        )

    return {
        "schema_version": "v0.1",
        "generated_at": utc_iso8601(),
        "portfolio_id": portfolio_id,
        "risk_policy_id": risk_policy["id"],
        "gate_results": gate_results,
    }


def find_portfolio(execution_bundle: dict[str, Any], portfolio_id: str) -> dict[str, Any]:
    for portfolio in execution_bundle.get("portfolio_accounts", []):
        if portfolio.get("id") == portfolio_id:
            return portfolio
    raise SystemExit(f"portfolio not found: {portfolio_id}")


def find_risk_policy(execution_bundle: dict[str, Any], policy_id: str) -> dict[str, Any]:
    for policy in execution_bundle.get("risk_policies", []):
        if policy.get("id") == policy_id:
            return policy
    raise SystemExit(f"risk policy not found: {policy_id}")


def current_position_notional(execution_bundle: dict[str, Any], portfolio_id: str) -> dict[str, float]:
    totals: dict[str, float] = {}
    for position in execution_bundle.get("positions", []):
        if position.get("portfolio_id") != portfolio_id:
            continue
        market_id = position["market_id"]
        totals[market_id] = totals.get(market_id, 0.0) + (float(position.get("size", 0.0)) * float(position.get("mark_price", 0.0)))
    return totals


def current_daily_notional(execution_bundle: dict[str, Any], portfolio_id: str) -> float:
    order_ids = {
        order["id"]
        for order in execution_bundle.get("orders", [])
        if order.get("portfolio_id") == portfolio_id
    }
    total = 0.0
    for execution in execution_bundle.get("executions", []):
        if execution.get("order_id") not in order_ids:
            continue
        total += float(execution.get("filled_quantity", 0.0)) * float(execution.get("filled_price", 0.0))
    return total


def choose_price_proxy(strategy_packet: dict[str, Any]) -> float:
    for key in ("robust_probability", "displayed_probability", "prior_probability"):
        value = strategy_packet.get(key)
        if isinstance(value, (int, float)) and value > 0:
            return float(value)
    return 0.5


def rule_gate(
    candidate: dict[str, Any],
    upstream_risk: dict[str, Any],
    risk_policy: dict[str, Any],
    projected_market_notional: float,
    projected_daily_notional: float,
    market_notional_limit: float,
) -> tuple[str, list[str]]:
    reasons: list[str] = []
    if candidate.get("proposed_action") == "hold":
        return "allow", ["no_action_required"]
    if upstream_risk.get("risk_gate") == "block":
        reasons.append("blocked_by_market_signal_risk")
    if projected_market_notional > float(risk_policy["max_position_usd"]):
        reasons.append("exceeds_max_position_usd")
    if projected_daily_notional > float(risk_policy["max_daily_notional_usd"]):
        reasons.append("exceeds_max_daily_notional_usd")
    if projected_market_notional > market_notional_limit:
        reasons.append("exceeds_market_concentration_limit")
    if float(candidate.get("confidence", 0.0)) < 0.35:
        reasons.append("low_decision_confidence")
    if reasons and any(reason in {"blocked_by_market_signal_risk", "exceeds_max_position_usd", "exceeds_max_daily_notional_usd", "exceeds_market_concentration_limit"} for reason in reasons):
        return "block", reasons
    if reasons or bool(risk_policy.get("requires_human_approval")):
        if not reasons:
            reasons.append("policy_requires_human_approval")
        return "review", reasons
    return "allow", ["risk_policy_ok"]


def utc_iso8601() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())

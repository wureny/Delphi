#!/usr/bin/env python3
from __future__ import annotations

from typing import Any


def validate_ontology_bundle(bundle: dict[str, Any]) -> None:
    _require_object(bundle, "ontology bundle")
    _require_keys(
        bundle,
        "ontology bundle",
        (
            "schema_version",
            "generated_at",
            "events",
            "markets",
            "outcomes",
            "market_microstructure_states",
            "liquidity_snapshots",
            "resolution_states",
            "news_signals",
        ),
    )
    events = _index_by_id(_require_list(bundle, "events", "ontology bundle"), "events")
    markets = _index_by_id(_require_list(bundle, "markets", "ontology bundle"), "markets")
    outcomes = _index_by_id(_require_list(bundle, "outcomes", "ontology bundle"), "outcomes")

    for market in markets.values():
        _require_keys(market, "market", ("id", "event_id", "outcome_ids", "trading_state", "question", "close_time"))
        if str(market["event_id"]) not in events:
            raise SystemExit(f"ontology bundle market references unknown event_id: {market['event_id']}")
        outcome_ids = market.get("outcome_ids")
        if not isinstance(outcome_ids, list) or not outcome_ids:
            raise SystemExit(f"ontology bundle market {market['id']} has empty/non-list outcome_ids")
        for outcome_id in outcome_ids:
            if str(outcome_id) not in outcomes:
                raise SystemExit(f"ontology bundle market {market['id']} references unknown outcome_id: {outcome_id}")

    for outcome in outcomes.values():
        _require_keys(outcome, "outcome", ("id", "market_id", "binary_side"))
        if str(outcome["market_id"]) not in markets:
            raise SystemExit(f"ontology bundle outcome references unknown market_id: {outcome['market_id']}")

    micro_states = _require_list(bundle, "market_microstructure_states", "ontology bundle")
    for state in micro_states:
        _require_keys(
            state,
            "market_microstructure_state",
            ("id", "market_id", "outcome_id", "robust_probability", "book_reliability_score", "trade_reliability_score"),
        )
        if str(state["market_id"]) not in markets:
            raise SystemExit(
                f"ontology bundle microstructure_state {state['id']} references unknown market_id: {state['market_id']}"
            )
        if str(state["outcome_id"]) not in outcomes:
            raise SystemExit(
                f"ontology bundle microstructure_state {state['id']} references unknown outcome_id: {state['outcome_id']}"
            )


def validate_agent_context(agent_context: dict[str, Any]) -> None:
    _require_object(agent_context, "agent context")
    _require_keys(
        agent_context,
        "agent context",
        (
            "schema_version",
            "generated_at",
            "research_agent_packets",
            "strategy_agent_packets",
            "risk_agent_packets",
            "audit_agent_packets",
            "candidate_decisions",
        ),
    )
    strategy_packets = _require_list(agent_context, "strategy_agent_packets", "agent context")
    risk_packets = _require_list(agent_context, "risk_agent_packets", "agent context")
    _require_list(agent_context, "research_agent_packets", "agent context")
    _require_list(agent_context, "audit_agent_packets", "agent context")
    candidate_decisions = _require_list(agent_context, "candidate_decisions", "agent context")

    strategy_keys: set[tuple[str, str]] = set()
    for packet in strategy_packets:
        _require_keys(packet, "strategy_agent_packet", ("market_id", "outcome_id", "event_id", "strategy_recommendation"))
        strategy_keys.add((str(packet["market_id"]), str(packet["outcome_id"])))

    risk_keys: set[tuple[str, str]] = set()
    for packet in risk_packets:
        _require_keys(packet, "risk_agent_packet", ("market_id", "outcome_id", "risk_gate"))
        risk_keys.add((str(packet["market_id"]), str(packet["outcome_id"])))

    for candidate in candidate_decisions:
        _require_keys(
            candidate,
            "candidate_decision",
            ("decision_id", "event_id", "market_id", "outcome_id", "proposed_action", "confidence"),
        )
        key = (str(candidate["market_id"]), str(candidate["outcome_id"]))
        if key not in strategy_keys:
            raise SystemExit(
                "agent context candidate_decision references (market_id,outcome_id) "
                "missing from strategy_agent_packets"
            )
        if key not in risk_keys:
            raise SystemExit(
                "agent context candidate_decision references (market_id,outcome_id) "
                "missing from risk_agent_packets"
            )


def validate_execution_bundle(execution_bundle: dict[str, Any]) -> None:
    _require_object(execution_bundle, "execution bundle")
    _require_keys(
        execution_bundle,
        "execution bundle",
        ("schema_version", "generated_at", "portfolio_accounts", "risk_policies", "positions", "orders", "executions"),
    )
    portfolios = _require_list(execution_bundle, "portfolio_accounts", "execution bundle")
    policies = _require_list(execution_bundle, "risk_policies", "execution bundle")
    _require_list(execution_bundle, "positions", "execution bundle")
    _require_list(execution_bundle, "orders", "execution bundle")
    _require_list(execution_bundle, "executions", "execution bundle")

    policy_ids = {
        str(item.get("id"))
        for item in policies
        if isinstance(item, dict) and item.get("id") is not None
    }
    if not policy_ids:
        raise SystemExit("execution bundle risk_policies is empty or missing valid policy ids")

    for portfolio in portfolios:
        _require_keys(portfolio, "portfolio_account", ("id", "risk_policy_id"))
        if str(portfolio["risk_policy_id"]) not in policy_ids:
            raise SystemExit(
                f"execution bundle portfolio {portfolio['id']} references unknown risk_policy_id: "
                f"{portfolio['risk_policy_id']}"
            )


def _require_object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise SystemExit(f"{label} must be a JSON object")
    return value


def _require_keys(value: dict[str, Any], label: str, keys: tuple[str, ...]) -> None:
    missing = [key for key in keys if key not in value]
    if missing:
        missing_text = ", ".join(missing)
        raise SystemExit(f"{label} missing required keys: {missing_text}")


def _require_list(value: dict[str, Any], key: str, parent_label: str) -> list[Any]:
    items = value.get(key)
    if not isinstance(items, list):
        raise SystemExit(f"{parent_label}.{key} must be a list")
    return items


def _index_by_id(items: list[Any], label: str) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict):
            raise SystemExit(f"{label} items must be JSON objects")
        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id.strip():
            raise SystemExit(f"{label} item missing non-empty string id")
        normalized_id = item_id.strip()
        if normalized_id in index:
            raise SystemExit(f"{label} contains duplicate id: {normalized_id}")
        index[normalized_id] = item
    return index

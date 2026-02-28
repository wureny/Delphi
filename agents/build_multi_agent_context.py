#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class AgentPolicy:
    min_reliability_for_action: float = 0.55
    max_risk_for_action: float = 0.70
    strong_conviction_threshold: float = 0.65
    weak_conviction_threshold: float = 0.55
    min_edge_for_action: float = 0.03


class MultiAgentContextBuilder:
    def __init__(self, policy: AgentPolicy | None = None) -> None:
        self.policy = policy or AgentPolicy()

    def build(self, bundle: dict[str, Any]) -> dict[str, Any]:
        events = {item["id"]: item for item in bundle.get("events", [])}
        markets = {item["id"]: item for item in bundle.get("markets", [])}
        outcomes = {item["id"]: item for item in bundle.get("outcomes", [])}
        news_by_market: dict[str | None, list[dict[str, Any]]] = {}
        for signal in bundle.get("news_signals", []):
            news_by_market.setdefault(signal.get("market_id"), []).append(signal)
        micro_by_outcome = {item["outcome_id"]: item for item in bundle.get("market_microstructure_states", [])}
        resolution_by_market = {item["market_id"]: item for item in bundle.get("resolution_states", [])}
        liquidity_by_market = {item["market_id"]: item for item in bundle.get("liquidity_snapshots", [])}

        research_packets = []
        strategy_packets = []
        risk_packets = []
        audit_packets = []
        candidate_decisions = []

        for market_id, market in sorted(markets.items()):
            event = events[market["event_id"]]
            outcome_views = []
            for outcome_id in market.get("outcome_ids", []):
                outcome = outcomes[outcome_id]
                micro = micro_by_outcome.get(outcome_id)
                if micro is None:
                    continue
                outcome_view = self._build_outcome_view(outcome, micro)
                outcome_views.append(outcome_view)
                strategy_packet = self._build_strategy_packet(event, market, outcome, micro)
                strategy_packets.append(strategy_packet)
                risk_packet = self._build_risk_packet(event, market, outcome, micro, strategy_packet)
                risk_packets.append(risk_packet)
                audit_packets.append(self._build_audit_packet(event, market, outcome, micro, bundle))
                candidate_decisions.append(self._build_candidate_decision(event, market, outcome, micro, strategy_packet, risk_packet))

            research_packets.append(
                {
                    "event_id": event["id"],
                    "event_title": event["title"],
                    "market_id": market_id,
                    "market_question": market["question"],
                    "category": event["category"],
                    "close_time": market["close_time"],
                    "trading_state": market["trading_state"],
                    "liquidity_snapshot": liquidity_by_market.get(market_id),
                    "resolution_state": resolution_by_market.get(market_id),
                    "related_news_signals": sorted(
                        news_by_market.get(market_id, []) + news_by_market.get(None, []),
                        key=lambda item: item["timestamp"],
                    ),
                    "outcomes": outcome_views,
                }
            )

        return {
            "schema_version": "v0.1",
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "source_bundle_generated_at": bundle.get("generated_at"),
            "research_agent_packets": research_packets,
            "strategy_agent_packets": strategy_packets,
            "risk_agent_packets": risk_packets,
            "audit_agent_packets": audit_packets,
            "candidate_decisions": candidate_decisions,
        }

    def _build_outcome_view(self, outcome: dict[str, Any], micro: dict[str, Any]) -> dict[str, Any]:
        return {
            "outcome_id": outcome["id"],
            "label": outcome["label"],
            "binary_side": outcome["binary_side"],
            "current_probability": outcome["current_probability"],
            "displayed_probability": micro["displayed_probability"],
            "robust_probability": micro["robust_probability"],
            "book_reliability_score": micro["book_reliability_score"],
            "trade_reliability_score": micro["trade_reliability_score"],
            "manipulation_risk_score": micro["manipulation_risk_score"],
            "signal_weights": micro["signal_weights"],
            "explanatory_tags": micro["explanatory_tags"],
        }

    def _build_strategy_packet(
        self,
        event: dict[str, Any],
        market: dict[str, Any],
        outcome: dict[str, Any],
        micro: dict[str, Any],
    ) -> dict[str, Any]:
        robust = float(micro["robust_probability"])
        prior = float(outcome["current_probability"])
        reliability = min(float(micro["book_reliability_score"]), float(micro["trade_reliability_score"]) + 0.15)
        edge = robust - prior if outcome["binary_side"] == "yes" else prior - robust
        recommendation = self._strategy_recommendation(outcome["binary_side"], robust, reliability, float(micro["manipulation_risk_score"]), edge)
        return {
            "agent": "strategy_agent",
            "event_id": event["id"],
            "market_id": market["id"],
            "outcome_id": outcome["id"],
            "binary_side": outcome["binary_side"],
            "market_question": market["question"],
            "displayed_probability": micro["displayed_probability"],
            "robust_probability": robust,
            "prior_probability": prior,
            "probability_edge": round(edge, 6),
            "book_reliability_score": micro["book_reliability_score"],
            "trade_reliability_score": micro["trade_reliability_score"],
            "manipulation_risk_score": micro["manipulation_risk_score"],
            "strategy_recommendation": recommendation,
            "explanatory_tags": micro["explanatory_tags"],
        }

    def _build_risk_packet(
        self,
        event: dict[str, Any],
        market: dict[str, Any],
        outcome: dict[str, Any],
        micro: dict[str, Any],
        strategy_packet: dict[str, Any],
    ) -> dict[str, Any]:
        gate, reasons = self._risk_gate(strategy_packet, micro)
        return {
            "agent": "risk_agent",
            "event_id": event["id"],
            "market_id": market["id"],
            "outcome_id": outcome["id"],
            "risk_gate": gate,
            "risk_reasons": reasons,
            "book_reliability_score": micro["book_reliability_score"],
            "trade_reliability_score": micro["trade_reliability_score"],
            "manipulation_risk_score": micro["manipulation_risk_score"],
            "signal_weights": micro["signal_weights"],
            "explanatory_tags": micro["explanatory_tags"],
        }

    def _build_audit_packet(
        self,
        event: dict[str, Any],
        market: dict[str, Any],
        outcome: dict[str, Any],
        micro: dict[str, Any],
        bundle: dict[str, Any],
    ) -> dict[str, Any]:
        evidence_refs = [event["id"], market["id"], outcome["id"], micro["id"]]
        return {
            "agent": "audit_agent",
            "event_id": event["id"],
            "market_id": market["id"],
            "outcome_id": outcome["id"],
            "evidence_refs": evidence_refs,
            "source_ids": sorted({source["id"] for source in bundle.get("sources", [])}),
            "display_price_source": micro["display_price_source"],
            "signal_weights": micro["signal_weights"],
            "explanatory_tags": micro["explanatory_tags"],
        }

    def _build_candidate_decision(
        self,
        event: dict[str, Any],
        market: dict[str, Any],
        outcome: dict[str, Any],
        micro: dict[str, Any],
        strategy_packet: dict[str, Any],
        risk_packet: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "decision_id": f"draft_{outcome['id']}",
            "event_id": event["id"],
            "market_id": market["id"],
            "outcome_id": outcome["id"],
            "proposed_action": self._decision_action(strategy_packet, risk_packet),
            "confidence": self._decision_confidence(strategy_packet, risk_packet),
            "thesis_summary": self._thesis_summary(strategy_packet, risk_packet),
            "evidence_refs": [event["id"], market["id"], outcome["id"], micro["id"]],
            "created_by_agent": "strategy_agent",
            "requires_risk_review": risk_packet["risk_gate"] != "allow",
            "risk_gate": risk_packet["risk_gate"],
        }

    def _strategy_recommendation(self, binary_side: str, robust: float, reliability: float, risk: float, edge: float) -> str:
        if reliability < self.policy.min_reliability_for_action or risk > self.policy.max_risk_for_action:
            return "monitor"
        if abs(edge) < self.policy.min_edge_for_action:
            return "hold"
        if binary_side == "yes" and robust >= self.policy.strong_conviction_threshold and edge > 0:
            return "consider_buy"
        if binary_side == "yes" and robust <= (1.0 - self.policy.strong_conviction_threshold) and edge < 0:
            return "consider_sell"
        if binary_side == "no" and robust >= self.policy.strong_conviction_threshold and edge > 0:
            return "consider_buy"
        if binary_side == "no" and robust <= (1.0 - self.policy.strong_conviction_threshold) and edge < 0:
            return "consider_sell"
        return "monitor"

    def _risk_gate(self, strategy_packet: dict[str, Any], micro: dict[str, Any]) -> tuple[str, list[str]]:
        reasons: list[str] = []
        if float(micro["manipulation_risk_score"]) >= 0.85:
            reasons.append("high_manipulation_risk")
        if float(micro["book_reliability_score"]) < 0.35:
            reasons.append("low_book_reliability")
        if float(micro["trade_reliability_score"]) < 0.20 and "trade_only_signal" in micro["explanatory_tags"]:
            reasons.append("unconfirmed_trade_only_signal")
        if strategy_packet["strategy_recommendation"] == "monitor":
            reasons.append("insufficient_conviction")
        if reasons and any(reason in {"high_manipulation_risk", "low_book_reliability", "unconfirmed_trade_only_signal"} for reason in reasons):
            return "block", reasons
        if reasons:
            return "caution", reasons
        return "allow", ["signal_quality_ok"]

    def _decision_action(self, strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> str:
        if risk_packet["risk_gate"] == "block":
            return "hold"
        mapping = {
            "consider_buy": "buy",
            "consider_sell": "sell",
            "hold": "hold",
            "monitor": "hold",
        }
        return mapping.get(strategy_packet["strategy_recommendation"], "hold")

    def _decision_confidence(self, strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> float:
        base = abs(float(strategy_packet["probability_edge"])) * 5.0
        base += 0.4 * float(strategy_packet["book_reliability_score"])
        base += 0.3 * float(strategy_packet["trade_reliability_score"])
        base -= 0.5 * float(strategy_packet["manipulation_risk_score"])
        if risk_packet["risk_gate"] == "block":
            base *= 0.25
        elif risk_packet["risk_gate"] == "caution":
            base *= 0.6
        return round(max(0.0, min(base, 1.0)), 6)

    def _thesis_summary(self, strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> str:
        return (
            f"Robust probability={strategy_packet['robust_probability']}, prior={strategy_packet['prior_probability']}, "
            f"edge={strategy_packet['probability_edge']}, risk_gate={risk_packet['risk_gate']}."
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build per-agent context packets from a Polymarket ontology bundle.")
    parser.add_argument("--bundle", required=True, help="Path to polymarket ontology bundle JSON.")
    parser.add_argument("--output", required=True, help="Path to write the multi-agent context JSON.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    bundle = json.loads(Path(args.bundle).read_text(encoding="utf-8"))
    context = MultiAgentContextBuilder().build(bundle)
    indent = 2 if args.pretty else None
    Path(args.output).write_text(json.dumps(context, indent=indent) + "\n", encoding="utf-8")
    print(
        f"[multi-agent] wrote {args.output} "
        f"research={len(context['research_agent_packets'])} "
        f"strategy={len(context['strategy_agent_packets'])} "
        f"risk={len(context['risk_agent_packets'])} "
        f"audit={len(context['audit_agent_packets'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

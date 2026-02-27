#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from statistics import mean
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from polymarket_microstructure import MicrostructureAnalyzer, OrderBookView, OutcomeContext, TradeView


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate displayed vs robust probability on curated microstructure cases.")
    parser.add_argument("--cases", required=True, help="Path to a benchmark JSON file or directory containing benchmark-case.json files.")
    parser.add_argument("--require-labeled", action="store_true", help="Fail if any loaded case lacks reference_probability.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    cases = load_cases(Path(args.cases))
    if not cases:
        raise SystemExit("no cases found")

    analyzer = MicrostructureAnalyzer()
    results: list[dict[str, Any]] = []
    skipped_cases: list[str] = []
    for case in cases:
        reference_probability = case.get("reference_probability")
        if reference_probability is None:
            skipped_cases.append(case.get("case_id", "unknown"))
            continue
        snapshot = build_snapshot(case)
        trades = build_trades(case)
        state = analyzer.analyze(
            outcome=OutcomeContext(
                market_id=case["market_id"],
                outcome_id=case["outcome_id"],
                fallback_probability=float(case["fallback_probability"]),
            ),
            snapshot=snapshot,
            trades=trades,
            source_id="src_delphi_microstructure_v0",
        )
        reference_probability = float(reference_probability)
        displayed_error = abs(state["displayed_probability"] - reference_probability)
        robust_error = abs(state["robust_probability"] - reference_probability)
        results.append(
            {
                "case_id": case["case_id"],
                "reference_probability": reference_probability,
                "displayed_probability": state["displayed_probability"],
                "robust_probability": state["robust_probability"],
                "displayed_error": round(displayed_error, 6),
                "robust_error": round(robust_error, 6),
                "improvement": round(displayed_error - robust_error, 6),
                "book_reliability_score": state["book_reliability_score"],
                "trade_reliability_score": state["trade_reliability_score"],
                "manipulation_risk_score": state["manipulation_risk_score"],
                "signal_weights": state["signal_weights"],
                "explanatory_tags": state["explanatory_tags"],
            }
        )

    if args.require_labeled and skipped_cases:
        raise SystemExit(f"found unlabeled benchmark cases: {', '.join(skipped_cases)}")
    if not results:
        raise SystemExit("no labeled cases available for evaluation")

    avg_displayed_error = mean(result["displayed_error"] for result in results)
    avg_robust_error = mean(result["robust_error"] for result in results)
    better_count = sum(1 for result in results if result["robust_error"] < result["displayed_error"])

    summary = {
        "num_cases": len(results),
        "num_skipped_unlabeled_cases": len(skipped_cases),
        "avg_displayed_error": round(avg_displayed_error, 6),
        "avg_robust_error": round(avg_robust_error, 6),
        "avg_improvement": round(avg_displayed_error - avg_robust_error, 6),
        "robust_better_case_count": better_count,
        "results": results,
    }
    if skipped_cases:
        summary["skipped_case_ids"] = skipped_cases
    print(json.dumps(summary, indent=2))
    return 0


def load_cases(path: Path) -> list[dict[str, Any]]:
    if path.is_dir():
        cases: list[dict[str, Any]] = []
        for file_path in sorted(path.rglob("benchmark-case.json")):
            payload = json.loads(file_path.read_text(encoding="utf-8"))
            if isinstance(payload, dict):
                cases.append(payload)
        return cases
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        return [payload]
    raise SystemExit("cases file must be a JSON object or array")


def build_snapshot(case: dict[str, Any]) -> OrderBookView | None:
    snapshot = case.get("snapshot")
    if snapshot is None:
        return None
    return OrderBookView(
        market_id=case["market_id"],
        outcome_id=case["outcome_id"],
        timestamp=snapshot["timestamp"],
        best_bid=snapshot.get("best_bid"),
        best_ask=snapshot.get("best_ask"),
        spread=snapshot.get("spread"),
        midpoint=snapshot.get("midpoint"),
        bid_depth_top_n=snapshot["bid_depth_top_n"],
        ask_depth_top_n=snapshot["ask_depth_top_n"],
        bid_levels=snapshot["bid_levels"],
        ask_levels=snapshot["ask_levels"],
    )


def build_trades(case: dict[str, Any]) -> list[TradeView]:
    trades = []
    for trade in case.get("trades", []):
        trades.append(
            TradeView(
                timestamp=trade["timestamp"],
                price=float(trade["price"]),
                size=float(trade["size"]),
                side=str(trade["side"]),
            )
        )
    return trades


if __name__ == "__main__":
    raise SystemExit(main())

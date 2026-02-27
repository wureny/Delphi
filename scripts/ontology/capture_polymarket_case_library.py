#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fetch_polymarket_public_snapshot import SUPPORTED_CATEGORIES, fetch_public_snapshot, write_json
from polymarket_mapper import PolymarketMapper


DEFAULT_SIGNAL_TAGS = {
    "trade_only_signal",
    "wide_spread",
    "small_trade_distortion_risk",
    "quote_not_trade_confirmed",
    "extreme_depth_imbalance",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture repeated Polymarket snapshots and archive high-risk benchmark cases.")
    parser.add_argument("--output-dir", required=True, help="Directory to write snapshot history and archived live cases.")
    parser.add_argument("--iterations", type=int, default=3, help="How many snapshots to capture.")
    parser.add_argument("--interval-seconds", type=int, default=15, help="Sleep duration between live snapshots.")
    parser.add_argument("--limit-events", type=int, default=10, help="Maximum number of events to keep per snapshot.")
    parser.add_argument("--category", action="append", choices=sorted(SUPPORTED_CATEGORIES), help="Repeatable category filter.")
    parser.add_argument("--include-closed", action="store_true", help="Include closed events and markets.")
    parser.add_argument("--risk-threshold", type=float, default=0.70, help="Archive states at or above this manipulation risk.")
    parser.add_argument("--divergence-threshold", type=float, default=0.08, help="Archive states at or above this quote/trade divergence.")
    parser.add_argument("--source-dir", help="Use local raw inputs instead of live fetching. Expects the standard three raw JSON files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir)
    snapshots_dir = output_dir / "snapshots"
    live_cases_dir = output_dir / "live-cases"
    snapshots_dir.mkdir(parents=True, exist_ok=True)
    live_cases_dir.mkdir(parents=True, exist_ok=True)

    mapper = PolymarketMapper()
    categories = set(args.category or SUPPORTED_CATEGORIES)
    manifest_entries: list[dict[str, Any]] = []

    for iteration in range(args.iterations):
        timestamp = utc_timestamp()
        snapshot_dir = snapshots_dir / timestamp
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        if args.source_dir:
            gamma_events, clob_messages, news_signals = load_local_raw(Path(args.source_dir))
        else:
            snapshot = fetch_public_snapshot(
                limit_events=args.limit_events,
                categories=categories,
                include_closed=args.include_closed,
            )
            gamma_events = snapshot["events"]
            clob_messages = snapshot["clob_messages"]
            news_signals = snapshot["news_signals"]

        bundle = mapper.build_bundle(
            gamma_payload=gamma_events,
            clob_payload=clob_messages,
            news_payload=news_signals,
        )
        write_json(snapshot_dir / "polymarket-gamma-events.json", gamma_events)
        write_json(snapshot_dir / "polymarket-clob-market-channel.json", clob_messages)
        write_json(snapshot_dir / "polymarket-news-signals.json", news_signals)
        write_json(snapshot_dir / "polymarket-ontology-bundle.json", bundle)

        cases = archive_candidates(
            output_dir=live_cases_dir,
            bundle=bundle,
            gamma_events=gamma_events,
            clob_messages=clob_messages,
            news_signals=news_signals,
            captured_at=timestamp,
            risk_threshold=args.risk_threshold,
            divergence_threshold=args.divergence_threshold,
        )
        manifest_entries.extend(cases)
        if iteration + 1 < args.iterations and not args.source_dir:
            time.sleep(max(args.interval_seconds, 0))

    write_json(output_dir / "case-library-index.json", manifest_entries)
    summary = {
        "num_snapshots": args.iterations,
        "num_archived_cases": len(manifest_entries),
        "output_dir": str(output_dir),
    }
    write_json(output_dir / "case-library-summary.json", summary)
    print(f"[case-library] snapshots={args.iterations} archived_cases={len(manifest_entries)} output_dir={output_dir}")
    return 0


def load_local_raw(source_dir: Path) -> tuple[Any, Any, Any]:
    gamma_events = json.loads(resolve_local_raw_path(source_dir, ["polymarket-gamma-events.json", "polymarket-gamma-events-sample.json"]).read_text(encoding="utf-8"))
    clob_messages = json.loads(resolve_local_raw_path(source_dir, ["polymarket-clob-market-channel.json", "polymarket-clob-market-channel-sample.json"]).read_text(encoding="utf-8"))
    news_signals = json.loads(resolve_local_raw_path(source_dir, ["polymarket-news-signals.json", "polymarket-news-signals-sample.json"]).read_text(encoding="utf-8"))
    return gamma_events, clob_messages, news_signals


def resolve_local_raw_path(source_dir: Path, candidates: list[str]) -> Path:
    for candidate in candidates:
        path = source_dir / candidate
        if path.exists():
            return path
    raise FileNotFoundError(f"could not find any of {candidates} in {source_dir}")


def archive_candidates(
    output_dir: Path,
    bundle: dict[str, Any],
    gamma_events: Any,
    clob_messages: list[dict[str, Any]],
    news_signals: Any,
    captured_at: str,
    risk_threshold: float,
    divergence_threshold: float,
) -> list[dict[str, Any]]:
    markets = {market["id"]: market for market in bundle["markets"]}
    outcomes = {outcome["id"]: outcome for outcome in bundle["outcomes"]}
    events = {event["id"]: event for event in bundle["events"]}
    snapshots_by_outcome = {snapshot["outcome_id"]: snapshot for snapshot in bundle["order_book_snapshots"]}
    trades_by_outcome: dict[str, list[dict[str, Any]]] = {}
    for trade in bundle["trade_prints"]:
        trades_by_outcome.setdefault(trade["outcome_id"], []).append(trade)

    archived: list[dict[str, Any]] = []
    for state in bundle["market_microstructure_states"]:
        should_archive = (
            state["manipulation_risk_score"] >= risk_threshold
            or state["quote_trade_divergence"] >= divergence_threshold
            or bool(DEFAULT_SIGNAL_TAGS.intersection(state["explanatory_tags"]))
        )
        if not should_archive:
            continue
        market = markets[state["market_id"]]
        outcome = outcomes[state["outcome_id"]]
        event = events[market["event_id"]]
        case_id = build_case_id(captured_at, state["market_id"], outcome["binary_side"])
        case_dir = output_dir / case_id
        (case_dir / "raw").mkdir(parents=True, exist_ok=True)
        (case_dir / "ontology").mkdir(parents=True, exist_ok=True)

        raw_gamma = filter_gamma_events(gamma_events, market["event_id"], state["market_id"])
        raw_clob = filter_clob_messages(clob_messages, state["market_id"], outcome["token_id"])
        ontology_slice = build_case_bundle_slice(bundle, state["market_id"], state["outcome_id"])
        benchmark_case = {
            "case_id": case_id,
            "status": "needs_reference_label",
            "captured_at": captured_at,
            "event_id": event["id"],
            "market_id": state["market_id"],
            "outcome_id": state["outcome_id"],
            "fallback_probability": outcome["current_probability"],
            "reference_probability": None,
            "suggested_reference_probability": state["robust_probability"],
            "snapshot": snapshots_by_outcome.get(state["outcome_id"]),
            "trades": trades_by_outcome.get(state["outcome_id"], []),
            "microstructure_state": state,
            "market_question": market["question"],
            "event_title": event["title"],
            "notes": "Populate reference_probability after manual review or external reference collection.",
            "label_metadata": {},
        }
        write_json(case_dir / "raw" / "polymarket-gamma-events.json", raw_gamma)
        write_json(case_dir / "raw" / "polymarket-clob-market-channel.json", raw_clob)
        write_json(case_dir / "raw" / "polymarket-news-signals.json", news_signals)
        write_json(case_dir / "ontology" / "case-bundle.json", ontology_slice)
        write_json(case_dir / "benchmark-case.json", benchmark_case)
        write_case_readme(case_dir / "README.md", benchmark_case)
        archived.append(
            {
                "case_id": case_id,
                "captured_at": captured_at,
                "case_dir": str(case_dir),
                "market_id": state["market_id"],
                "outcome_id": state["outcome_id"],
                "manipulation_risk_score": state["manipulation_risk_score"],
                "quote_trade_divergence": state["quote_trade_divergence"],
                "explanatory_tags": state["explanatory_tags"],
            }
        )
    return archived


def filter_gamma_events(gamma_events: Any, event_id: str, market_id: str) -> list[dict[str, Any]]:
    filtered = []
    for event in gamma_events:
        if not isinstance(event, dict):
            continue
        if str(event.get("id") or event.get("slug") or "") != event_id:
            continue
        clone = dict(event)
        clone["markets"] = [market for market in event.get("markets", []) if isinstance(market, dict) and str(market.get("id") or market.get("conditionId") or "") == market_id]
        filtered.append(clone)
    return filtered


def filter_clob_messages(clob_messages: list[dict[str, Any]], market_id: str, token_id: str) -> list[dict[str, Any]]:
    filtered = []
    for message in clob_messages:
        if not isinstance(message, dict):
            continue
        if str(message.get("market") or message.get("id") or "") == market_id or str(message.get("asset_id") or "") == token_id:
            filtered.append(message)
    return filtered


def build_case_bundle_slice(bundle: dict[str, Any], market_id: str, outcome_id: str) -> dict[str, Any]:
    market = next(item for item in bundle["markets"] if item["id"] == market_id)
    event = next(item for item in bundle["events"] if item["id"] == market["event_id"])
    outcome_ids = set(market["outcome_ids"])
    return {
        "schema_version": bundle["schema_version"],
        "generated_at": bundle["generated_at"],
        "sources": bundle["sources"],
        "events": [event],
        "markets": [market],
        "outcomes": [item for item in bundle["outcomes"] if item["id"] in outcome_ids],
        "price_points": [item for item in bundle["price_points"] if item["outcome_id"] in outcome_ids],
        "order_book_snapshots": [item for item in bundle["order_book_snapshots"] if item["outcome_id"] == outcome_id],
        "trade_prints": [item for item in bundle["trade_prints"] if item["outcome_id"] == outcome_id],
        "liquidity_snapshots": [item for item in bundle["liquidity_snapshots"] if item["market_id"] == market_id],
        "news_signals": [item for item in bundle["news_signals"] if item.get("market_id") in (None, market_id) and item["event_id"] == event["id"]],
        "resolution_states": [item for item in bundle["resolution_states"] if item["market_id"] == market_id],
        "market_microstructure_states": [item for item in bundle["market_microstructure_states"] if item["outcome_id"] == outcome_id],
    }


def write_case_readme(path: Path, benchmark_case: dict[str, Any]) -> None:
    content = "\n".join(
        [
            f"# {benchmark_case['case_id']}",
            "",
            f"- Event: {benchmark_case['event_title']}",
            f"- Market: {benchmark_case['market_question']}",
            f"- Outcome: {benchmark_case['outcome_id']}",
            f"- Captured At: {benchmark_case['captured_at']}",
            f"- Status: {benchmark_case['status']}",
            f"- Suggested Reference Probability: {benchmark_case['suggested_reference_probability']}",
            f"- Manipulation Risk: {benchmark_case['microstructure_state']['manipulation_risk_score']}",
            f"- Quote/Trade Divergence: {benchmark_case['microstructure_state']['quote_trade_divergence']}",
            f"- Tags: {', '.join(benchmark_case['microstructure_state']['explanatory_tags'])}",
            "",
            "Populate `reference_probability` in `benchmark-case.json` after manual review.",
            "",
        ]
    )
    path.write_text(content, encoding="utf-8")


def build_case_id(captured_at: str, market_id: str, binary_side: str) -> str:
    return f"{captured_at}__{market_id}__{binary_side}".replace(":", "").replace("/", "_")


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


if __name__ == "__main__":
    raise SystemExit(main())

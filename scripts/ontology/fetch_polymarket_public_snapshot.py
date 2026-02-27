#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from polymarket_public_clients import ClobPublicClient, GammaPublicClient

SUPPORTED_CATEGORIES = {"crypto", "finance"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch a public Polymarket snapshot and convert it into local raw inputs.")
    parser.add_argument("--output-dir", required=True, help="Directory to write raw input JSON files.")
    parser.add_argument("--limit-events", type=int, default=10, help="Maximum number of events to keep after filtering.")
    parser.add_argument("--category", action="append", choices=sorted(SUPPORTED_CATEGORIES), help="Repeatable category filter. Defaults to crypto and finance.")
    parser.add_argument("--include-closed", action="store_true", help="Include closed events and markets.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    snapshot = fetch_public_snapshot(
        limit_events=args.limit_events,
        categories=set(args.category or SUPPORTED_CATEGORIES),
        include_closed=args.include_closed,
    )
    write_snapshot_files(Path(args.output_dir), snapshot)
    print(
        f"[fetch] wrote {len(snapshot['events'])} events and {len(snapshot['clob_messages'])} clob messages to {args.output_dir}"
    )
    print(f"[fetch] token_ids={len(snapshot['token_ids'])} books={len(snapshot['books'])}")
    return 0


def fetch_public_snapshot(
    limit_events: int = 10,
    categories: set[str] | None = None,
    include_closed: bool = False,
    gamma: GammaPublicClient | None = None,
    clob: ClobPublicClient | None = None,
) -> dict[str, Any]:
    categories = set(categories or SUPPORTED_CATEGORIES)
    gamma = gamma or GammaPublicClient()
    clob = clob or ClobPublicClient()

    event_params = {
        "limit": max(limit_events * 3, 30),
        "active": "false" if include_closed else "true",
        "closed": "true" if include_closed else "false",
        "archived": "false",
    }
    events = gamma.list_events(**event_params)
    filtered_events = [
        event
        for event in events
        if normalize_category(event.get("category") or event.get("tags")) in categories
    ]
    filtered_events = [
        event
        for event in filtered_events
        if any(market_is_supported(raw_market, categories, event_tags=event.get("tags")) for raw_market in extract_markets_from_event(event))
    ]
    filtered_events = filtered_events[:limit_events]

    token_ids: list[str] = []
    for event in filtered_events:
        normalized_markets = []
        for raw_market in extract_markets_from_event(event):
            if not market_is_supported(raw_market, categories, event_tags=event.get("tags")):
                continue
            normalized_market = normalize_market(raw_market)
            normalized_markets.append(normalized_market)
            token_ids.extend(normalize_token_ids(normalized_market))
        event["markets"] = normalized_markets

    token_ids = sorted({token_id for token_id in token_ids if token_id})
    books = clob.get_books(token_ids) if token_ids else []
    last_trade_prices: dict[str, Any]
    try:
        last_trade_prices = clob.get_last_trade_prices(token_ids) if token_ids else {}
    except Exception:
        last_trade_prices = {}

    clob_messages = books_to_market_channel_messages(
        books=books,
        last_trade_prices=last_trade_prices,
        events=filtered_events,
    )
    return {
        "captured_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "events": filtered_events,
        "clob_messages": clob_messages,
        "news_signals": [],
        "token_ids": token_ids,
        "books": books,
    }


def write_snapshot_files(output_dir: Path, snapshot: dict[str, Any]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "polymarket-gamma-events.json", snapshot["events"])
    write_json(output_dir / "polymarket-clob-market-channel.json", snapshot["clob_messages"])
    write_json(output_dir / "polymarket-news-signals.json", snapshot.get("news_signals", []))
    write_json(output_dir / "snapshot-metadata.json", {
        "captured_at": snapshot.get("captured_at"),
        "token_ids": snapshot.get("token_ids", []),
        "num_books": len(snapshot.get("books", [])),
    })


def normalize_category(value: Any) -> str | None:
    if isinstance(value, list):
        tag_slugs = {
            str(tag.get("slug") or "").strip().lower()
            for tag in value
            if isinstance(tag, dict)
        }
        if "crypto" in tag_slugs:
            return "crypto"
        finance_slugs = {"finance", "economy", "business", "stocks", "ipos", "macro"}
        if tag_slugs & finance_slugs:
            return "finance"
        return None
    if value is None:
        return None
    category = str(value).strip().lower()
    alias_map = {
        "cryptocurrency": "crypto",
        "economy": "finance",
        "macro": "finance",
    }
    return alias_map.get(category, category)


def extract_markets_from_event(event: dict[str, Any]) -> list[dict[str, Any]]:
    markets = event.get("markets")
    if isinstance(markets, list):
        return [market for market in markets if isinstance(market, dict)]
    return []


def market_is_supported(raw_market: dict[str, Any], categories: set[str], event_tags: Any | None = None) -> bool:
    category = normalize_category(raw_market.get("category")) or normalize_category(event_tags)
    outcomes = normalize_outcomes(raw_market)
    token_ids = normalize_token_ids(raw_market)
    return (
        category in categories
        and bool(raw_market.get("enableOrderBook", False))
        and len(outcomes) == 2
        and len(token_ids) == 2
    )


def normalize_market(raw_market: dict[str, Any]) -> dict[str, Any]:
    market = dict(raw_market)
    if isinstance(market.get("outcomes"), str):
        market["outcomes"] = json.loads(market["outcomes"])
    if isinstance(market.get("outcomePrices"), str):
        market["outcomePrices"] = json.loads(market["outcomePrices"])
    if isinstance(market.get("clobTokenIds"), str):
        market["clobTokenIds"] = json.loads(market["clobTokenIds"])
    return market


def normalize_outcomes(raw_market: dict[str, Any]) -> list[str]:
    value = raw_market.get("outcomes")
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except json.JSONDecodeError:
            return []
    return []


def normalize_token_ids(raw_market: dict[str, Any]) -> list[str]:
    value = raw_market.get("clobTokenIds") or raw_market.get("assets_ids")
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except json.JSONDecodeError:
            return []
    return []


def books_to_market_channel_messages(
    books: list[dict[str, Any]],
    last_trade_prices: dict[str, Any],
    events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    seen_last_trade_assets: set[str] = set()
    for book in books:
        asset_id = str(book.get("asset_id") or "")
        market = str(book.get("market") or "")
        timestamp = normalize_timestamp(book.get("timestamp"))
        bids = normalize_levels(book.get("bids"))
        asks = normalize_levels(book.get("asks"))
        messages.append(
            {
                "event_type": "book",
                "asset_id": asset_id,
                "market": market,
                "bids": bids,
                "asks": asks,
                "timestamp": timestamp,
            }
        )
        best_bid = max((float(level["price"]) for level in bids), default=None)
        best_ask = min((float(level["price"]) for level in asks), default=None)
        spread = None
        if best_bid is not None and best_ask is not None:
            spread = max(best_ask - best_bid, 0.0)
        messages.append(
            {
                "event_type": "best_bid_ask",
                "asset_id": asset_id,
                "market": market,
                "best_bid": best_bid,
                "best_ask": best_ask,
                "spread": spread,
                "timestamp": timestamp,
            }
        )
        last_trade_value = lookup_last_trade_price(last_trade_prices, asset_id)
        if last_trade_value is not None:
            seen_last_trade_assets.add(asset_id)
            messages.append(
                {
                    "event_type": "last_trade_price",
                    "asset_id": asset_id,
                    "market": market,
                    "price": last_trade_value,
                    "side": "BUY",
                    "size": 0.0,
                    "fee_rate_bps": 0.0,
                    "timestamp": timestamp,
                }
            )
    for event in events:
        for market in event.get("markets", []):
            fallback_messages = market_metadata_last_trade_messages(market, seen_last_trade_assets)
            for message in fallback_messages:
                seen_last_trade_assets.add(message["asset_id"])
            messages.extend(fallback_messages)
    return messages


def market_metadata_last_trade_messages(raw_market: dict[str, Any], seen_last_trade_assets: set[str]) -> list[dict[str, Any]]:
    outcomes = normalize_outcomes(raw_market)
    token_ids = normalize_token_ids(raw_market)
    if len(outcomes) != 2 or len(token_ids) != 2:
        return []
    yes_index = 0
    for idx, label in enumerate(outcomes):
        if str(label).strip().lower() == "yes":
            yes_index = idx
            break
    try:
        yes_price = float(raw_market.get("lastTradePrice"))
    except (TypeError, ValueError):
        return []
    yes_price = max(0.0, min(1.0, yes_price))
    no_price = max(0.0, min(1.0, 1.0 - yes_price))
    timestamp = normalize_timestamp(raw_market.get("updatedAt") or raw_market.get("endDate"))
    pairs = [
        (token_ids[yes_index], yes_price),
        (token_ids[1 - yes_index], no_price),
    ]
    messages = []
    for asset_id, price in pairs:
        if asset_id in seen_last_trade_assets:
            continue
        messages.append(
            {
                "event_type": "last_trade_price",
                "asset_id": asset_id,
                "market": str(raw_market.get("id") or raw_market.get("conditionId") or ""),
                "price": price,
                "side": "BUY",
                "size": 0.0,
                "fee_rate_bps": 0.0,
                "timestamp": timestamp,
            }
        )
    return messages


def lookup_last_trade_price(payload: dict[str, Any], asset_id: str) -> float | None:
    value = payload.get(asset_id)
    if value is None:
        return None
    if isinstance(value, dict):
        for key in ("price", "last_trade_price", "BUY", "SELL"):
            candidate = value.get(key)
            if candidate is not None:
                return float(candidate)
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_levels(levels: Any) -> list[dict[str, Any]]:
    normalized = []
    if not isinstance(levels, list):
        return normalized
    for level in levels:
        if not isinstance(level, dict):
            continue
        normalized.append(
            {
                "price": str(level.get("price")),
                "size": str(level.get("size")),
            }
        )
    return normalized


def normalize_timestamp(value: Any) -> str:
    if value is None:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return str(value)


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())

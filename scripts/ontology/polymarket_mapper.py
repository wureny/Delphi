#!/usr/bin/env python3
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from polymarket_microstructure import MicrostructureAnalyzer, OrderBookView, OutcomeContext, TradeView

SUPPORTED_CATEGORIES = {"crypto", "finance"}


@dataclass(frozen=True)
class MapperConfig:
    top_n_levels: int = 3


class PolymarketMapper:
    def __init__(self, config: MapperConfig | None = None) -> None:
        self.config = config or MapperConfig()
        self.microstructure_analyzer = MicrostructureAnalyzer()

    def build_bundle(
        self,
        gamma_payload: Any,
        clob_payload: Any,
        news_payload: Any | None = None,
        generated_at: str | None = None,
    ) -> dict[str, Any]:
        generated_at = generated_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        gamma_events = self._normalize_gamma_events(gamma_payload)
        clob_messages = self._normalize_clob_messages(clob_payload)
        news_signals = self._normalize_news_signals(news_payload)

        bundle: dict[str, Any] = {
            "schema_version": "v0.4",
            "generated_at": generated_at,
            "sources": self._default_sources(generated_at, include_news=bool(news_signals)),
            "events": [],
            "markets": [],
            "outcomes": [],
            "price_points": [],
            "order_book_snapshots": [],
            "trade_prints": [],
            "liquidity_snapshots": [],
            "news_signals": [],
            "resolution_states": [],
            "market_microstructure_states": [],
        }

        token_context: dict[str, dict[str, str]] = {}
        market_context: dict[str, dict[str, Any]] = {}
        outcome_context: dict[str, dict[str, Any]] = {}

        for raw_event in gamma_events:
            event = self._map_event(raw_event)
            if event is None:
                continue
            raw_markets = raw_event.get("markets") or []
            mapped_markets: list[dict[str, Any]] = []
            for raw_market in raw_markets:
                mapped_market = self._map_market(raw_market, event_id=event["id"])
                if mapped_market is None:
                    continue
                mapped_outcomes = self._map_outcomes(raw_market, market_id=mapped_market["id"])
                if len(mapped_outcomes) != 2:
                    continue
                mapped_market["outcome_ids"] = [outcome["id"] for outcome in mapped_outcomes]
                mapped_markets.append(mapped_market)
                bundle["markets"].append(mapped_market)
                bundle["outcomes"].extend(mapped_outcomes)
                bundle["price_points"].extend(self._map_price_points(mapped_outcomes, generated_at))
                bundle["liquidity_snapshots"].append(self._map_liquidity_snapshot(raw_market, generated_at))
                market_context[mapped_market["id"]] = {
                    "market": mapped_market,
                    "raw_market": raw_market,
                    "outcomes": mapped_outcomes,
                }
                for outcome in mapped_outcomes:
                    outcome_context[outcome["id"]] = {
                        "market_id": mapped_market["id"],
                        "current_probability": outcome["current_probability"],
                    }
                    token_context[outcome["token_id"]] = {
                        "outcome_id": outcome["id"],
                        "market_id": mapped_market["id"],
                    }
            if not mapped_markets:
                continue
            event["market_ids"] = [market["id"] for market in mapped_markets]
            event["status"] = self._derive_event_status(mapped_markets)
            bundle["events"].append(event)

        clob_state = self._map_clob_messages(clob_messages, token_context)
        bundle["trade_prints"] = clob_state["trade_prints"]
        bundle["order_book_snapshots"] = clob_state["order_book_snapshots"]
        resolution_overrides = clob_state["resolution_overrides"]

        for market_id, context in market_context.items():
            resolution_state = self._map_resolution_state(
                raw_market=context["raw_market"],
                generated_at=generated_at,
                resolution_override=resolution_overrides.get(market_id),
                mapped_outcomes=context["outcomes"],
            )
            bundle["resolution_states"].append(resolution_state)

        bundle["news_signals"] = self._map_news_signals(news_signals, market_context)
        bundle["market_microstructure_states"] = self._build_microstructure_states(
            bundle=bundle,
            outcome_context=outcome_context,
        )
        return bundle

    def build_bundle_from_paths(
        self,
        gamma_path: Path,
        clob_path: Path,
        news_path: Path | None = None,
        generated_at: str | None = None,
    ) -> dict[str, Any]:
        gamma_payload = json.loads(gamma_path.read_text(encoding="utf-8"))
        clob_payload = json.loads(clob_path.read_text(encoding="utf-8"))
        news_payload = None
        if news_path is not None:
            news_payload = json.loads(news_path.read_text(encoding="utf-8"))
        return self.build_bundle(
            gamma_payload=gamma_payload,
            clob_payload=clob_payload,
            news_payload=news_payload,
            generated_at=generated_at,
        )

    def _normalize_gamma_events(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            for key in ("events", "data"):
                value = payload.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]
        raise ValueError("gamma payload must be a list of events or an object containing events")

    def _normalize_clob_messages(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            for key in ("messages", "events", "data"):
                value = payload.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]
        raise ValueError("clob payload must be a list of messages or an object containing messages")

    def _normalize_news_signals(self, payload: Any | None) -> list[dict[str, Any]]:
        if payload is None:
            return []
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            for key in ("news_signals", "signals", "data"):
                value = payload.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]
        raise ValueError("news payload must be a list of signals or an object containing signals")

    def _default_sources(self, generated_at: str, include_news: bool) -> list[dict[str, Any]]:
        sources = [
            {
                "id": "src_polymarket_gamma_api",
                "name": "Polymarket Gamma API",
                "type": "api",
                "uri": "https://gamma-api.polymarket.com",
                "ingested_at": generated_at,
            },
            {
                "id": "src_polymarket_clob_ws",
                "name": "Polymarket CLOB Market Channel",
                "type": "stream",
                "uri": "wss://ws-subscriptions-clob.polymarket.com/ws/market",
                "ingested_at": generated_at,
            },
            {
                "id": "src_delphi_microstructure_v0",
                "name": "Delphi Microstructure Analyzer v0",
                "type": "derived",
                "uri": "delphi://analytics/microstructure/v0",
                "ingested_at": generated_at,
            },
        ]
        if include_news:
            sources.append(
                {
                    "id": "src_external_news",
                    "name": "External News Feed",
                    "type": "manual",
                    "uri": "https://example.com/news-feed",
                    "ingested_at": generated_at,
                }
            )
        return sources

    def _map_event(self, raw_event: dict[str, Any]) -> dict[str, Any] | None:
        category = self._normalize_category(
            raw_event.get("category")
            or raw_event.get("tag")
            or raw_event.get("series")
            or raw_event.get("tags")
        )
        if category not in SUPPORTED_CATEGORIES:
            return None
        event_id = self._string(raw_event.get("id") or raw_event.get("event_id") or raw_event.get("slug"))
        slug = self._string(raw_event.get("slug") or event_id)
        return {
            "id": event_id,
            "title": self._string(raw_event.get("title") or raw_event.get("name") or slug),
            "slug": slug,
            "category": category,
            "sub_category": self._nullable_string(raw_event.get("subCategory") or raw_event.get("subcategory")),
            "start_time": self._to_iso8601(raw_event.get("startDate") or raw_event.get("start_time") or raw_event.get("createdAt")),
            "end_time": self._to_iso8601(raw_event.get("endDate") or raw_event.get("end_time") or raw_event.get("endDateIso") or raw_event.get("resolutionDate")),
            "status": "open",
            "market_ids": [],
            "source_id": "src_polymarket_gamma_api",
        }

    def _map_market(self, raw_market: dict[str, Any], event_id: str) -> dict[str, Any] | None:
        outcome_labels = self._list_of_strings(raw_market.get("outcomes"))
        token_ids = self._list_of_strings(raw_market.get("clobTokenIds") or raw_market.get("assets_ids"))
        if len(outcome_labels) != 2 or len(token_ids) != 2:
            return None
        market_id = self._string(raw_market.get("id") or raw_market.get("market") or raw_market.get("conditionId"))
        return {
            "id": market_id,
            "event_id": event_id,
            "question": self._string(raw_market.get("question") or raw_market.get("title") or raw_market.get("description") or market_id),
            "slug": self._string(raw_market.get("slug") or market_id),
            "market_type": "binary",
            "condition_id": self._string(raw_market.get("conditionId") or raw_market.get("condition_id") or market_id),
            "question_id": self._string(raw_market.get("questionID") or raw_market.get("questionId") or raw_market.get("id") or market_id),
            "description": self._string(raw_market.get("description") or ""),
            "close_time": self._to_iso8601(raw_market.get("endDate") or raw_market.get("closeTime") or raw_market.get("end_time")),
            "trading_state": self._derive_trading_state(raw_market),
            "outcome_ids": [],
            "orderbook_enabled": bool(raw_market.get("enableOrderBook", False)),
            "source_id": "src_polymarket_gamma_api",
        }

    def _map_outcomes(self, raw_market: dict[str, Any], market_id: str) -> list[dict[str, Any]]:
        labels = self._list_of_strings(raw_market.get("outcomes"))
        probabilities = self._list_of_floats(raw_market.get("outcomePrices") or raw_market.get("prices"))
        token_ids = self._list_of_strings(raw_market.get("clobTokenIds") or raw_market.get("assets_ids"))
        if len(labels) != 2 or len(token_ids) != 2:
            return []
        if len(probabilities) != 2:
            yes_probability = self._safe_float(raw_market.get("probability"), default=0.5)
            probabilities = [yes_probability, 1.0 - yes_probability]
        normalized_sides = [self._normalize_binary_side(label) for label in labels]
        outcome_ids = [f"out_{market_id}_{side}" for side in normalized_sides]
        mapped_outcomes: list[dict[str, Any]] = []
        for index, label in enumerate(labels):
            mapped_outcomes.append(
                {
                    "id": outcome_ids[index],
                    "market_id": market_id,
                    "label": self._string(label),
                    "binary_side": normalized_sides[index],
                    "token_id": self._string(token_ids[index]),
                    "complement_outcome_id": outcome_ids[1 - index],
                    "current_probability": self._clamp_probability(probabilities[index]),
                }
            )
        return mapped_outcomes

    def _map_price_points(self, outcomes: list[dict[str, Any]], generated_at: str) -> list[dict[str, Any]]:
        points = []
        for outcome in outcomes:
            points.append(
                {
                    "id": f"pp_{outcome['outcome_id'] if 'outcome_id' in outcome else outcome['id']}_{self._compact_timestamp(generated_at)}",
                    "outcome_id": outcome["id"],
                    "timestamp": generated_at,
                    "probability": outcome["current_probability"],
                    "price": outcome["current_probability"],
                    "source_id": "src_polymarket_gamma_api",
                }
            )
        return points

    def _map_liquidity_snapshot(self, raw_market: dict[str, Any], generated_at: str) -> dict[str, Any]:
        market_id = self._string(raw_market.get("id") or raw_market.get("market") or raw_market.get("conditionId"))
        return {
            "id": f"liq_{market_id}_{self._compact_timestamp(generated_at)}",
            "market_id": market_id,
            "timestamp": generated_at,
            "liquidity_usd": self._safe_float(raw_market.get("liquidity"), default=0.0),
            "volume_24h_usd": self._safe_float(raw_market.get("volume24hr") or raw_market.get("volume_24hr"), default=0.0),
        }

    def _map_clob_messages(
        self,
        messages: list[dict[str, Any]],
        token_context: dict[str, dict[str, str]],
    ) -> dict[str, Any]:
        book_state: dict[str, dict[str, Any]] = {}
        trade_prints: list[dict[str, Any]] = []
        resolution_overrides: dict[str, dict[str, Any]] = {}

        for message in messages:
            event_type = self._string(message.get("event_type") or message.get("type") or "")
            if event_type == "book":
                self._handle_book_message(book_state, message, token_context)
            elif event_type == "best_bid_ask":
                self._handle_best_bid_ask_message(book_state, message, token_context)
            elif event_type == "tick_size_change":
                self._handle_tick_size_change_message(book_state, message, token_context)
            elif event_type == "price_change":
                self._handle_price_change_message(book_state, message, token_context)
            elif event_type == "last_trade_price":
                trade = self._handle_trade_message(message, token_context)
                if trade is not None:
                    trade_prints.append(trade)
            elif event_type == "market_resolved":
                self._handle_market_resolved_message(resolution_overrides, message, token_context)

        snapshots = []
        for outcome_id, state in sorted(book_state.items()):
            snapshot = self._build_order_book_snapshot(outcome_id, state)
            if snapshot is not None:
                snapshots.append(snapshot)

        return {
            "order_book_snapshots": snapshots,
            "trade_prints": sorted(trade_prints, key=lambda trade: trade["timestamp"]),
            "resolution_overrides": resolution_overrides,
        }

    def _handle_book_message(self, book_state: dict[str, dict[str, Any]], message: dict[str, Any], token_context: dict[str, dict[str, str]]) -> None:
        asset_id = self._string(message.get("asset_id"))
        context = token_context.get(asset_id)
        if context is None:
            return
        outcome_id = context["outcome_id"]
        state = book_state.setdefault(
            outcome_id,
            {
                "market_id": context["market_id"],
                "outcome_id": outcome_id,
                "bid_levels": [],
                "ask_levels": [],
                "tick_size": 0.01,
            },
        )
        state["timestamp"] = self._to_iso8601(message.get("timestamp"))
        state["bid_levels"] = self._normalize_book_levels(message.get("bids"))
        state["ask_levels"] = self._normalize_book_levels(message.get("asks"))
        state["market_hash"] = self._string(message.get("market") or state.get("market_hash") or context["market_id"])
        self._refresh_best_prices(state)

    def _handle_best_bid_ask_message(self, book_state: dict[str, dict[str, Any]], message: dict[str, Any], token_context: dict[str, dict[str, str]]) -> None:
        asset_id = self._string(message.get("asset_id"))
        context = token_context.get(asset_id)
        if context is None:
            return
        outcome_id = context["outcome_id"]
        state = book_state.setdefault(
            outcome_id,
            {
                "market_id": context["market_id"],
                "outcome_id": outcome_id,
                "bid_levels": [],
                "ask_levels": [],
                "tick_size": 0.01,
            },
        )
        state["timestamp"] = self._to_iso8601(message.get("timestamp"))
        state["best_bid"] = self._nullable_float(message.get("best_bid"))
        state["best_ask"] = self._nullable_float(message.get("best_ask"))
        state["spread"] = self._nullable_float(message.get("spread"))
        if state.get("best_bid") is not None and state.get("best_ask") is not None:
            state["midpoint"] = (state["best_bid"] + state["best_ask"]) / 2.0

    def _handle_tick_size_change_message(self, book_state: dict[str, dict[str, Any]], message: dict[str, Any], token_context: dict[str, dict[str, str]]) -> None:
        asset_id = self._string(message.get("asset_id"))
        context = token_context.get(asset_id)
        if context is None:
            return
        state = book_state.setdefault(
            context["outcome_id"],
            {
                "market_id": context["market_id"],
                "outcome_id": context["outcome_id"],
                "bid_levels": [],
                "ask_levels": [],
            },
        )
        state["timestamp"] = self._to_iso8601(message.get("timestamp"))
        state["tick_size"] = self._safe_float(message.get("new_tick_size"), default=state.get("tick_size", 0.01))

    def _handle_price_change_message(self, book_state: dict[str, dict[str, Any]], message: dict[str, Any], token_context: dict[str, dict[str, str]]) -> None:
        timestamp = self._to_iso8601(message.get("timestamp"))
        for change in message.get("price_changes", []):
            if not isinstance(change, dict):
                continue
            asset_id = self._string(change.get("asset_id"))
            context = token_context.get(asset_id)
            if context is None:
                continue
            state = book_state.setdefault(
                context["outcome_id"],
                {
                    "market_id": context["market_id"],
                    "outcome_id": context["outcome_id"],
                    "bid_levels": [],
                    "ask_levels": [],
                    "tick_size": 0.01,
                },
            )
            state["timestamp"] = timestamp
            best_bid = self._nullable_float(change.get("best_bid"))
            best_ask = self._nullable_float(change.get("best_ask"))
            if best_bid is not None:
                state["best_bid"] = best_bid
            if best_ask is not None:
                state["best_ask"] = best_ask
            if state.get("best_bid") is not None and state.get("best_ask") is not None:
                state["spread"] = max(state["best_ask"] - state["best_bid"], 0.0)
                state["midpoint"] = (state["best_bid"] + state["best_ask"]) / 2.0

    def _handle_trade_message(self, message: dict[str, Any], token_context: dict[str, dict[str, str]]) -> dict[str, Any] | None:
        asset_id = self._string(message.get("asset_id"))
        context = token_context.get(asset_id)
        if context is None:
            return None
        timestamp = self._to_iso8601(message.get("timestamp"))
        return {
            "id": f"tp_{context['outcome_id']}_{self._compact_timestamp(timestamp)}",
            "market_id": context["market_id"],
            "outcome_id": context["outcome_id"],
            "timestamp": timestamp,
            "price": self._clamp_probability(self._safe_float(message.get("price"), default=0.0)),
            "size": self._safe_float(message.get("size"), default=0.0),
            "side": self._normalize_trade_side(message.get("side")),
            "fee_rate_bps": self._safe_float(message.get("fee_rate_bps"), default=0.0),
            "source_id": "src_polymarket_clob_ws",
        }

    def _handle_market_resolved_message(
        self,
        resolution_overrides: dict[str, dict[str, Any]],
        message: dict[str, Any],
        token_context: dict[str, dict[str, str]],
    ) -> None:
        market_id = self._string(message.get("id") or message.get("market"))
        winning_asset_id = self._string(message.get("winning_asset_id") or "")
        context = token_context.get(winning_asset_id)
        winning_outcome_id = context["outcome_id"] if context is not None else None
        resolution_overrides[market_id] = {
            "resolved": True,
            "resolution_time": self._to_iso8601(message.get("timestamp")),
            "winning_outcome_id": winning_outcome_id,
            "resolution_notes": f"Resolved to {self._string(message.get('winning_outcome') or 'unknown outcome')}",
            "evidence": "Derived from market_resolved websocket event.",
        }

    def _build_order_book_snapshot(self, outcome_id: str, state: dict[str, Any]) -> dict[str, Any] | None:
        timestamp = state.get("timestamp")
        if not timestamp:
            return None
        bid_levels = state.get("bid_levels", [])[: self.config.top_n_levels]
        ask_levels = state.get("ask_levels", [])[: self.config.top_n_levels]
        best_bid = state.get("best_bid")
        best_ask = state.get("best_ask")
        spread = state.get("spread")
        midpoint = state.get("midpoint")
        if spread is None and best_bid is not None and best_ask is not None:
            spread = max(best_ask - best_bid, 0.0)
        if midpoint is None and best_bid is not None and best_ask is not None:
            midpoint = (best_bid + best_ask) / 2.0
        return {
            "id": f"obs_{outcome_id}_{self._compact_timestamp(timestamp)}",
            "market_id": state["market_id"],
            "outcome_id": outcome_id,
            "timestamp": timestamp,
            "best_bid": best_bid,
            "best_ask": best_ask,
            "spread": spread,
            "midpoint": midpoint,
            "bid_depth_top_n": round(sum(level["size"] for level in bid_levels), 6),
            "ask_depth_top_n": round(sum(level["size"] for level in ask_levels), 6),
            "tick_size": round(self._safe_float(state.get("tick_size"), default=0.01), 6),
            "bid_levels": bid_levels,
            "ask_levels": ask_levels,
            "source_id": "src_polymarket_clob_ws",
        }

    def _map_resolution_state(
        self,
        raw_market: dict[str, Any],
        generated_at: str,
        resolution_override: dict[str, Any] | None,
        mapped_outcomes: list[dict[str, Any]],
    ) -> dict[str, Any]:
        market_id = self._string(raw_market.get("id") or raw_market.get("market") or raw_market.get("conditionId"))
        if resolution_override is not None:
            return {
                "id": f"rs_{market_id}",
                "market_id": market_id,
                "resolved": True,
                "resolution_time": resolution_override["resolution_time"],
                "winning_outcome_id": resolution_override["winning_outcome_id"],
                "resolution_notes": resolution_override["resolution_notes"],
                "evidence": resolution_override["evidence"],
            }
        winning_outcome_id = self._nullable_string(raw_market.get("winningOutcomeId"))
        if winning_outcome_id is None:
            winning_asset_id = self._nullable_string(raw_market.get("winningAssetId"))
            if winning_asset_id is not None:
                for outcome in mapped_outcomes:
                    if outcome["token_id"] == winning_asset_id:
                        winning_outcome_id = outcome["id"]
                        break
        resolved = bool(raw_market.get("closed", False) and not raw_market.get("active", True) and winning_outcome_id is not None)
        resolution_time = self._to_iso8601(raw_market.get("resolutionDate") or raw_market.get("endDate") or generated_at)
        if resolved:
            resolution_notes = f"Resolved to {winning_outcome_id}."
            evidence = "Derived from Gamma market metadata."
        else:
            resolution_notes = "Pending resolution."
            evidence = "No resolution evidence available in current source snapshot."
        return {
            "id": f"rs_{market_id}",
            "market_id": market_id,
            "resolved": resolved,
            "resolution_time": resolution_time,
            "winning_outcome_id": winning_outcome_id,
            "resolution_notes": resolution_notes,
            "evidence": evidence,
        }

    def _map_news_signals(self, news_signals: list[dict[str, Any]], market_context: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
        if not news_signals:
            return []
        valid_market_ids = set(market_context)
        valid_event_ids = {context["market"]["event_id"] for context in market_context.values()}
        mapped = []
        for signal in news_signals:
            event_id = self._nullable_string(signal.get("event_id"))
            market_id = self._nullable_string(signal.get("market_id"))
            if event_id not in valid_event_ids:
                continue
            if market_id is not None and market_id not in valid_market_ids:
                continue
            mapped.append(
                {
                    "id": self._string(signal.get("id") or f"news_{len(mapped) + 1}"),
                    "event_id": event_id,
                    "market_id": market_id,
                    "timestamp": self._to_iso8601(signal.get("timestamp") or signal.get("published_at")),
                    "headline": self._string(signal.get("headline") or signal.get("title") or "Untitled signal"),
                    "url": self._string(signal.get("url") or "https://example.com"),
                    "sentiment_score": self._clamp(self._safe_float(signal.get("sentiment_score"), default=0.0), -1.0, 1.0),
                    "source_id": "src_external_news",
                }
            )
        return sorted(mapped, key=lambda item: item["timestamp"])

    def _build_microstructure_states(self, bundle: dict[str, Any], outcome_context: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
        snapshots_by_outcome = {snapshot["outcome_id"]: snapshot for snapshot in bundle["order_book_snapshots"]}
        trades_by_outcome: dict[str, list[dict[str, Any]]] = {}
        for trade in bundle["trade_prints"]:
            trades_by_outcome.setdefault(trade["outcome_id"], []).append(trade)
        states = []
        for outcome_id, context in sorted(outcome_context.items()):
            snapshot_data = snapshots_by_outcome.get(outcome_id)
            trade_data = trades_by_outcome.get(outcome_id, [])
            if snapshot_data is None and not trade_data:
                continue
            snapshot = None
            if snapshot_data is not None:
                snapshot = OrderBookView(
                    market_id=snapshot_data["market_id"],
                    outcome_id=outcome_id,
                    timestamp=snapshot_data["timestamp"],
                    best_bid=snapshot_data["best_bid"],
                    best_ask=snapshot_data["best_ask"],
                    spread=snapshot_data["spread"],
                    midpoint=snapshot_data["midpoint"],
                    bid_depth_top_n=snapshot_data["bid_depth_top_n"],
                    ask_depth_top_n=snapshot_data["ask_depth_top_n"],
                    bid_levels=snapshot_data["bid_levels"],
                    ask_levels=snapshot_data["ask_levels"],
                )
            trades = [
                TradeView(
                    timestamp=trade["timestamp"],
                    price=trade["price"],
                    size=trade["size"],
                    side=trade["side"],
                )
                for trade in sorted(trade_data, key=lambda item: item["timestamp"])
            ]
            state = self.microstructure_analyzer.analyze(
                outcome=OutcomeContext(
                    market_id=context["market_id"],
                    outcome_id=outcome_id,
                    fallback_probability=context["current_probability"],
                ),
                snapshot=snapshot,
                trades=trades,
                source_id="src_delphi_microstructure_v0",
            )
            states.append(state)
        return states

    def _normalize_book_levels(self, levels: Any) -> list[dict[str, float]]:
        normalized: list[dict[str, float]] = []
        if not isinstance(levels, list):
            return normalized
        for level in levels:
            if not isinstance(level, dict):
                continue
            normalized.append(
                {
                    "price": self._clamp_probability(self._safe_float(level.get("price"), default=0.0)),
                    "size": self._safe_float(level.get("size"), default=0.0),
                }
            )
        return normalized

    def _refresh_best_prices(self, state: dict[str, Any]) -> None:
        bids = state.get("bid_levels", [])
        asks = state.get("ask_levels", [])
        if bids:
            state["best_bid"] = max(level["price"] for level in bids)
        if asks:
            state["best_ask"] = min(level["price"] for level in asks)
        if state.get("best_bid") is not None and state.get("best_ask") is not None:
            state["spread"] = max(state["best_ask"] - state["best_bid"], 0.0)
            state["midpoint"] = (state["best_bid"] + state["best_ask"]) / 2.0

    def _normalize_category(self, value: Any) -> str | None:
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
        text = self._nullable_string(value)
        if text is None:
            return None
        normalized = text.strip().lower()
        alias_map = {
            "cryptocurrency": "crypto",
            "crypto markets": "crypto",
            "economy": "finance",
            "financials": "finance",
            "macro": "finance",
        }
        return alias_map.get(normalized, normalized)

    def _normalize_binary_side(self, label: str) -> str:
        normalized = label.strip().lower()
        if normalized in {"yes", "y", "true", "up", "higher"}:
            return "yes"
        if normalized in {"no", "n", "false", "down", "lower"}:
            return "no"
        raise ValueError(f"unsupported binary label: {label}")

    def _derive_trading_state(self, raw_market: dict[str, Any]) -> str:
        active = bool(raw_market.get("active", False))
        closed = bool(raw_market.get("closed", False))
        archived = bool(raw_market.get("archived", False))
        if archived:
            return "archived"
        if closed and not active:
            return "closed"
        if active and bool(raw_market.get("enableOrderBook", False)):
            return "active"
        if active:
            return "inactive"
        return "inactive"

    def _derive_event_status(self, markets: list[dict[str, Any]]) -> str:
        states = {market["trading_state"] for market in markets}
        if states == {"resolved"}:
            return "resolved"
        if "active" in states or "inactive" in states:
            return "open"
        return "closed"

    def _normalize_trade_side(self, value: Any) -> str:
        normalized = self._string(value).lower()
        if normalized == "sell":
            return "sell"
        return "buy"

    def _list_of_strings(self, value: Any) -> list[str]:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                value = json.loads(value)
            elif not value:
                return []
            else:
                return [item.strip() for item in value.split(",") if item.strip()]
        if not isinstance(value, list):
            return []
        return [self._string(item) for item in value]

    def _list_of_floats(self, value: Any) -> list[float]:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                value = json.loads(value)
            elif not value:
                return []
            else:
                return [self._safe_float(item) for item in value.split(",")]
        if not isinstance(value, list):
            return []
        return [self._safe_float(item) for item in value]

    def _safe_float(self, value: Any, default: float = 0.0) -> float:
        if value is None:
            return default
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _nullable_float(self, value: Any) -> float | None:
        if value in (None, "", "null"):
            return None
        return self._safe_float(value)

    def _to_iso8601(self, value: Any) -> str:
        if value is None:
            return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        if isinstance(value, (int, float)):
            timestamp = float(value)
            if timestamp > 1_000_000_000_000:
                timestamp /= 1000.0
            return datetime.fromtimestamp(timestamp, tz=timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        text = self._string(value)
        if text.endswith("Z"):
            return text
        if text.isdigit():
            return self._to_iso8601(int(text))
        return text

    def _string(self, value: Any) -> str:
        if value is None:
            return ""
        return str(value)

    def _nullable_string(self, value: Any) -> str | None:
        if value in (None, "", "null"):
            return None
        return self._string(value)

    def _clamp_probability(self, value: float) -> float:
        return self._clamp(value, 0.0, 1.0)

    def _clamp(self, value: float, low: float, high: float) -> float:
        return max(low, min(high, value))

    def _compact_timestamp(self, timestamp: str) -> str:
        return timestamp.replace("-", "").replace(":", "").replace("T", "_").replace("Z", "")

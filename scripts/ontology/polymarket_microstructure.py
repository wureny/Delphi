#!/usr/bin/env python3
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class MicrostructureConfig:
    top_n_levels: int = 3
    wide_spread_threshold: float = 0.10
    divergence_threshold: float = 0.08
    depth_reference: float = 5000.0
    depth_target_size: float = 1000.0
    trade_reference_size: float = 1200.0
    tiny_trade_threshold: float = 75.0
    stale_trade_threshold_seconds: float = 180.0


@dataclass(frozen=True)
class OrderBookView:
    market_id: str
    outcome_id: str
    timestamp: str
    best_bid: float | None
    best_ask: float | None
    spread: float | None
    midpoint: float | None
    bid_depth_top_n: float
    ask_depth_top_n: float
    bid_levels: list[dict[str, float]]
    ask_levels: list[dict[str, float]]


@dataclass(frozen=True)
class TradeView:
    timestamp: str
    price: float
    size: float
    side: str


@dataclass(frozen=True)
class OutcomeContext:
    market_id: str
    outcome_id: str
    fallback_probability: float


class MicrostructureAnalyzer:
    def __init__(self, config: MicrostructureConfig | None = None) -> None:
        self.config = config or MicrostructureConfig()

    def analyze(
        self,
        outcome: OutcomeContext,
        snapshot: OrderBookView | None,
        trades: list[TradeView],
        source_id: str,
    ) -> dict[str, Any]:
        displayed_probability, display_price_source = self._displayed_probability(
            snapshot=snapshot,
            trades=trades,
            fallback_probability=outcome.fallback_probability,
        )
        depth_imbalance = self._depth_imbalance(snapshot)
        quote_trade_divergence = self._quote_trade_divergence(snapshot, trades)
        depth_weighted_mid = self._depth_weighted_mid(snapshot)
        trade_anchor = self._trade_anchor(trades)
        trade_reliability_score = self._trade_reliability_score(
            snapshot=snapshot,
            trades=trades,
            quote_trade_divergence=quote_trade_divergence,
        )
        book_reliability_score = self._book_reliability_score(
            snapshot=snapshot,
            trades=trades,
            depth_imbalance=depth_imbalance,
            quote_trade_divergence=quote_trade_divergence,
            trade_reliability_score=trade_reliability_score,
        )
        signal_weights = self._signal_weights(
            display_price_source=display_price_source,
            snapshot=snapshot,
            depth_weighted_mid=depth_weighted_mid,
            trade_anchor=trade_anchor,
            book_reliability_score=book_reliability_score,
            trade_reliability_score=trade_reliability_score,
        )
        robust_probability = self._robust_probability(
            displayed_probability=displayed_probability,
            depth_weighted_mid=depth_weighted_mid,
            trade_anchor=trade_anchor,
            fallback_probability=outcome.fallback_probability,
            signal_weights=signal_weights,
        )
        manipulation_risk_score = self._manipulation_risk_score(
            snapshot=snapshot,
            trades=trades,
            book_reliability_score=book_reliability_score,
            trade_reliability_score=trade_reliability_score,
            quote_trade_divergence=quote_trade_divergence,
        )
        explanatory_tags = self._explanatory_tags(
            snapshot=snapshot,
            trades=trades,
            book_reliability_score=book_reliability_score,
            trade_reliability_score=trade_reliability_score,
            manipulation_risk_score=manipulation_risk_score,
            quote_trade_divergence=quote_trade_divergence,
            depth_imbalance=depth_imbalance,
            signal_weights=signal_weights,
        )
        timestamp = self._analysis_timestamp(snapshot=snapshot, trades=trades)
        return {
            "id": f"mms_{outcome.outcome_id}_{self._compact_timestamp(timestamp)}",
            "market_id": outcome.market_id,
            "outcome_id": outcome.outcome_id,
            "timestamp": timestamp,
            "displayed_probability": round(displayed_probability, 6),
            "display_price_source": display_price_source,
            "robust_probability": round(robust_probability, 6),
            "book_reliability_score": round(book_reliability_score, 6),
            "trade_reliability_score": round(trade_reliability_score, 6),
            "manipulation_risk_score": round(manipulation_risk_score, 6),
            "depth_imbalance": round(depth_imbalance, 6),
            "quote_trade_divergence": round(quote_trade_divergence, 6),
            "signal_weights": {key: round(value, 6) for key, value in signal_weights.items()},
            "explanatory_tags": explanatory_tags,
            "source_id": source_id,
        }

    def _analysis_timestamp(self, snapshot: OrderBookView | None, trades: list[TradeView]) -> str:
        if snapshot:
            return snapshot.timestamp
        if trades:
            return trades[-1].timestamp
        raise ValueError("cannot analyze microstructure without snapshot or trades")

    def _compact_timestamp(self, timestamp: str) -> str:
        return timestamp.replace("-", "").replace(":", "").replace("T", "_").replace("Z", "")

    def _displayed_probability(
        self,
        snapshot: OrderBookView | None,
        trades: list[TradeView],
        fallback_probability: float,
    ) -> tuple[float, str]:
        if snapshot and snapshot.best_bid is not None and snapshot.best_ask is not None:
            if (snapshot.spread or 0.0) <= self.config.wide_spread_threshold and snapshot.midpoint is not None:
                return self._clamp_probability(snapshot.midpoint), "midpoint"
            last_trade = self._latest_trade(trades)
            if last_trade is not None:
                return self._clamp_probability(last_trade.price), "last_trade"
            if snapshot.midpoint is not None:
                return self._clamp_probability(snapshot.midpoint), "midpoint"
        last_trade = self._latest_trade(trades)
        if last_trade is not None:
            return self._clamp_probability(last_trade.price), "last_trade"
        return self._clamp_probability(fallback_probability), "derived"

    def _depth_imbalance(self, snapshot: OrderBookView | None) -> float:
        if snapshot is None:
            return 0.0
        total_depth = snapshot.bid_depth_top_n + snapshot.ask_depth_top_n
        if total_depth <= 0:
            return 0.0
        return (snapshot.bid_depth_top_n - snapshot.ask_depth_top_n) / total_depth

    def _quote_trade_divergence(self, snapshot: OrderBookView | None, trades: list[TradeView]) -> float:
        last_trade = self._latest_trade(trades)
        if snapshot is None or last_trade is None:
            return 0.0
        reference_price = snapshot.midpoint
        if reference_price is None:
            return 0.0
        return abs(reference_price - last_trade.price)

    def _depth_weighted_mid(self, snapshot: OrderBookView | None) -> float | None:
        if snapshot is None:
            return None
        buy_price = self._execution_price(snapshot.ask_levels, side="buy")
        sell_price = self._execution_price(snapshot.bid_levels, side="sell")
        if buy_price is None and sell_price is None:
            return None
        if buy_price is None:
            return self._clamp_probability(sell_price)
        if sell_price is None:
            return self._clamp_probability(buy_price)
        return self._clamp_probability((buy_price + sell_price) / 2.0)

    def _trade_anchor(self, trades: list[TradeView]) -> float | None:
        if not trades:
            return None
        total_size = sum(max(trade.size, 0.0) for trade in trades)
        if total_size <= 0:
            return self._clamp_probability(trades[-1].price)
        vwap = sum(trade.price * max(trade.size, 0.0) for trade in trades) / total_size
        return self._clamp_probability(vwap)

    def _execution_price(self, levels: list[dict[str, float]], side: str) -> float | None:
        if not levels:
            return None
        if side == "buy":
            sorted_levels = sorted(levels, key=lambda level: level["price"])
        else:
            sorted_levels = sorted(levels, key=lambda level: level["price"], reverse=True)
        target_size = min(sum(level["size"] for level in sorted_levels), self.config.depth_target_size)
        if target_size <= 0:
            return None
        remaining = target_size
        total_cost = 0.0
        for level in sorted_levels:
            if remaining <= 0:
                break
            fill = min(level["size"], remaining)
            total_cost += fill * level["price"]
            remaining -= fill
        filled = target_size - remaining
        if filled <= 0:
            return None
        return total_cost / filled

    def _trade_reliability_score(
        self,
        snapshot: OrderBookView | None,
        trades: list[TradeView],
        quote_trade_divergence: float,
    ) -> float:
        if not trades:
            return 0.0
        total_trade_size = sum(max(trade.size, 0.0) for trade in trades)
        size_score = min(math.log1p(total_trade_size) / math.log1p(self.config.trade_reference_size), 1.0)
        latest_trade = self._latest_trade(trades)
        recency_score = 1.0
        if snapshot is not None and latest_trade is not None:
            age_seconds = abs(self._timestamp_seconds(snapshot.timestamp) - self._timestamp_seconds(latest_trade.timestamp))
            recency_score = 1.0 - min(age_seconds / self.config.stale_trade_threshold_seconds, 1.0)
        confirmation_score = 0.6
        if snapshot is not None:
            confirmation_score = 1.0 - min(quote_trade_divergence / self.config.divergence_threshold, 1.0)
        tiny_trade_penalty = 0.0
        if latest_trade is not None and latest_trade.size < self.config.tiny_trade_threshold:
            tiny_trade_penalty = 0.20
        score = (0.45 * size_score) + (0.30 * recency_score) + (0.25 * confirmation_score) - tiny_trade_penalty
        return self._clamp(score, 0.0, 1.0)

    def _book_reliability_score(
        self,
        snapshot: OrderBookView | None,
        trades: list[TradeView],
        depth_imbalance: float,
        quote_trade_divergence: float,
        trade_reliability_score: float,
    ) -> float:
        if snapshot is None:
            return 0.2 if trades else 0.0
        depth_score = min(
            math.log1p(min(snapshot.bid_depth_top_n, snapshot.ask_depth_top_n)) / math.log1p(self.config.depth_reference),
            1.0,
        )
        if snapshot.spread is None:
            spread_score = 0.0
        else:
            spread_score = 1.0 - min(snapshot.spread / self.config.wide_spread_threshold, 1.0)
        if trades:
            divergence_score = 1.0 - min(quote_trade_divergence / self.config.divergence_threshold, 1.0)
            trade_score = 0.4 + (0.6 * min(trade_reliability_score, divergence_score))
        else:
            trade_score = 0.25
        balance_score = 1.0 - min(abs(depth_imbalance), 1.0)
        score = (0.35 * depth_score) + (0.25 * spread_score) + (0.25 * trade_score) + (0.15 * balance_score)
        return self._clamp(score, 0.0, 1.0)

    def _signal_weights(
        self,
        display_price_source: str,
        snapshot: OrderBookView | None,
        depth_weighted_mid: float | None,
        trade_anchor: float | None,
        book_reliability_score: float,
        trade_reliability_score: float,
    ) -> dict[str, float]:
        weights = {
            "displayed": 0.0,
            "book_anchor": 0.0,
            "trade_anchor": 0.0,
            "fallback_anchor": 0.0,
        }
        if snapshot is not None and depth_weighted_mid is not None:
            weights["book_anchor"] = 0.50 * book_reliability_score
        if trade_anchor is not None:
            weights["trade_anchor"] = 0.35 * trade_reliability_score
        if display_price_source == "midpoint":
            weights["displayed"] = 0.15 * book_reliability_score
        elif display_price_source == "last_trade":
            weights["displayed"] = 0.10 * trade_reliability_score
        else:
            weights["displayed"] = 0.05
        total = sum(weights.values())
        if total > 1.0:
            scale = 1.0 / total
            for key in weights:
                weights[key] *= scale
            total = 1.0
        weights["fallback_anchor"] = max(0.0, 1.0 - total)
        total = sum(weights.values())
        if total <= 0:
            return {
                "displayed": 0.0,
                "book_anchor": 0.0,
                "trade_anchor": 0.0,
                "fallback_anchor": 1.0,
            }
        return {key: value / total for key, value in weights.items()}

    def _robust_probability(
        self,
        displayed_probability: float,
        depth_weighted_mid: float | None,
        trade_anchor: float | None,
        fallback_probability: float,
        signal_weights: dict[str, float],
    ) -> float:
        book_anchor = depth_weighted_mid if depth_weighted_mid is not None else fallback_probability
        trade_probability = trade_anchor if trade_anchor is not None else fallback_probability
        blended = (
            signal_weights["displayed"] * displayed_probability
            + signal_weights["book_anchor"] * book_anchor
            + signal_weights["trade_anchor"] * trade_probability
            + signal_weights["fallback_anchor"] * fallback_probability
        )
        return self._clamp_probability(blended)

    def _manipulation_risk_score(
        self,
        snapshot: OrderBookView | None,
        trades: list[TradeView],
        book_reliability_score: float,
        trade_reliability_score: float,
        quote_trade_divergence: float,
    ) -> float:
        risk = 1.0 - (0.65 * book_reliability_score + 0.35 * trade_reliability_score)
        if snapshot is not None and snapshot.spread is not None and snapshot.spread > self.config.wide_spread_threshold:
            risk += 0.12
        min_depth = 0.0
        if snapshot is not None:
            min_depth = min(snapshot.bid_depth_top_n, snapshot.ask_depth_top_n)
        if snapshot is None:
            risk += 0.10
        elif min_depth < (0.2 * self.config.depth_reference):
            risk += 0.12
        if trades:
            latest_trade = self._latest_trade(trades)
            if latest_trade is not None and latest_trade.size < self.config.tiny_trade_threshold:
                risk += 0.08
            if quote_trade_divergence > self.config.divergence_threshold:
                risk += 0.12
        else:
            risk += 0.05
        return self._clamp(risk, 0.0, 1.0)

    def _explanatory_tags(
        self,
        snapshot: OrderBookView | None,
        trades: list[TradeView],
        book_reliability_score: float,
        trade_reliability_score: float,
        manipulation_risk_score: float,
        quote_trade_divergence: float,
        depth_imbalance: float,
        signal_weights: dict[str, float],
    ) -> list[str]:
        tags: list[str] = []
        if snapshot is not None and snapshot.spread is not None:
            if snapshot.spread > self.config.wide_spread_threshold:
                tags.append("wide_spread")
            else:
                tags.append("narrow_spread")
        if snapshot is not None:
            min_depth = min(snapshot.bid_depth_top_n, snapshot.ask_depth_top_n)
            if min_depth < (0.2 * self.config.depth_reference):
                tags.append("shallow_book")
            elif min_depth >= (0.8 * self.config.depth_reference):
                tags.append("deep_book")
            else:
                tags.append("healthy_depth")
        else:
            tags.append("no_book_snapshot")
        if trades:
            latest_trade = self._latest_trade(trades)
            if snapshot is None:
                tags.append("trade_only_signal")
            elif quote_trade_divergence <= self.config.divergence_threshold:
                tags.append("trade_confirmed")
            else:
                tags.append("quote_not_trade_confirmed")
            if latest_trade is not None and latest_trade.size < self.config.tiny_trade_threshold:
                tags.append("tiny_recent_trade")
            elif trade_reliability_score >= 0.70:
                tags.append("strong_trade_support")
        else:
            tags.append("no_recent_trade")
        if abs(depth_imbalance) > 0.5:
            tags.append("extreme_depth_imbalance")
        if signal_weights["fallback_anchor"] >= 0.50:
            tags.append("fallback_anchored")
        if signal_weights["book_anchor"] >= 0.40:
            tags.append("book_anchored")
        if signal_weights["trade_anchor"] >= 0.25:
            tags.append("trade_anchored")
        if manipulation_risk_score >= 0.70:
            tags.append("small_trade_distortion_risk")
        elif book_reliability_score >= 0.80:
            tags.append("reliable_signal")
        return tags

    def _latest_trade(self, trades: list[TradeView]) -> TradeView | None:
        if not trades:
            return None
        return sorted(trades, key=lambda trade: trade.timestamp)[-1]

    def _timestamp_seconds(self, value: str) -> float:
        normalized = value
        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"
        try:
            return datetime.fromisoformat(normalized).timestamp()
        except ValueError:
            return datetime.now(timezone.utc).timestamp()

    def _clamp_probability(self, value: float) -> float:
        return self._clamp(value, 0.0, 1.0)

    def _clamp(self, value: float, low: float, high: float) -> float:
        return max(low, min(high, value))

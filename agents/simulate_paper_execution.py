#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_PORTFOLIO_ID = "pf_main"
DEFAULT_FILL_RATIO = 1.0
DEFAULT_FEE_BPS = 10.0
DEFAULT_SLIPPAGE_BPS = 5.0
DEFAULT_SIMULATION_PREFIX = "sim"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Simulate paper execution from order proposals and update execution/position/PnL "
            "state on a fund-execution bundle."
        )
    )
    parser.add_argument("--order-proposals", required=True, help="Path to order proposals JSON.")
    parser.add_argument("--decision-records", required=True, help="Path to decision records JSON for audit linkage.")
    parser.add_argument("--execution-bundle", required=True, help="Path to fund execution bundle JSON.")
    parser.add_argument("--output", required=True, help="Path to write paper-trading payload JSON.")
    parser.add_argument("--portfolio-id", default=DEFAULT_PORTFOLIO_ID, help="Portfolio account id for simulation.")
    parser.add_argument(
        "--execute-proposed-orders",
        action="store_true",
        help="Execute orders with status=proposed (simulation-mode auto approval).",
    )
    parser.add_argument("--fill-ratio", type=float, default=DEFAULT_FILL_RATIO, help="Fill ratio in [0,1].")
    parser.add_argument("--fee-bps", type=float, default=DEFAULT_FEE_BPS, help="Fee in basis points.")
    parser.add_argument("--slippage-bps", type=float, default=DEFAULT_SLIPPAGE_BPS, help="Slippage in basis points.")
    parser.add_argument("--simulation-prefix", default=DEFAULT_SIMULATION_PREFIX, help="Prefix for simulation ids.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print output JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    order_payload = json.loads(Path(args.order_proposals).read_text(encoding="utf-8"))
    decision_payload = json.loads(Path(args.decision_records).read_text(encoding="utf-8"))
    execution_bundle = json.loads(Path(args.execution_bundle).read_text(encoding="utf-8"))
    payload = simulate_paper_execution(
        order_payload=order_payload,
        decision_payload=decision_payload,
        execution_bundle=execution_bundle,
        portfolio_id=args.portfolio_id,
        execute_proposed_orders=args.execute_proposed_orders,
        fill_ratio=args.fill_ratio,
        fee_bps=args.fee_bps,
        slippage_bps=args.slippage_bps,
        simulation_prefix=args.simulation_prefix,
    )
    indent = 2 if args.pretty else None
    Path(args.output).write_text(json.dumps(payload, indent=indent) + "\n", encoding="utf-8")
    print(
        f"[paper-trading] wrote {args.output} "
        f"executions={len(payload['execution_records'])} "
        f"position_updates={len(payload['position_updates'])}"
    )
    return 0


def simulate_paper_execution(
    order_payload: dict[str, Any],
    decision_payload: dict[str, Any],
    execution_bundle: dict[str, Any],
    portfolio_id: str,
    execute_proposed_orders: bool,
    fill_ratio: float,
    fee_bps: float,
    slippage_bps: float,
    simulation_prefix: str,
) -> dict[str, Any]:
    fill_ratio = clamp(fill_ratio, 0.0, 1.0)
    fee_bps = max(0.0, float(fee_bps))
    slippage_bps = max(0.0, float(slippage_bps))
    now = utc_iso8601()
    simulation_id = build_simulation_id(simulation_prefix, now)

    updated_bundle = copy.deepcopy(execution_bundle)
    decisions_by_id = {
        str(item.get("id")): item
        for item in decision_payload.get("decision_records", [])
        if item.get("id") is not None
    }

    position_index = build_position_index(updated_bundle.get("positions", []))
    position_ids = {str(item.get("id")) for item in updated_bundle.get("positions", []) if item.get("id") is not None}
    execution_ids = {str(item.get("id")) for item in updated_bundle.get("executions", []) if item.get("id") is not None}

    executed_orders: list[dict[str, Any]] = []
    execution_records: list[dict[str, Any]] = []
    execution_audit_trail: list[dict[str, Any]] = []
    skipped_orders: list[dict[str, Any]] = []
    position_updates: dict[str, dict[str, Any]] = {}

    gross_notional_usd = 0.0
    total_fee_usd = 0.0
    realized_pnl_usd = 0.0
    filled_order_count = 0

    for order in order_payload.get("orders", []):
        order_id = str(order.get("id") or "")
        if not order_id:
            skipped_orders.append({"order_id": "", "reason": "missing_order_id"})
            continue
        if order.get("portfolio_id") != portfolio_id:
            skipped_orders.append({"order_id": order_id, "reason": "portfolio_mismatch"})
            continue

        status = normalize_order_status(order.get("status"))
        if status == "rejected":
            skipped_orders.append({"order_id": order_id, "reason": "rejected_by_gate"})
            continue
        if status == "proposed" and not execute_proposed_orders:
            skipped_orders.append({"order_id": order_id, "reason": "awaiting_human_approval"})
            continue
        if status not in {"approved", "proposed"}:
            skipped_orders.append({"order_id": order_id, "reason": f"unsupported_order_status:{status}"})
            continue

        quantity = max(0.0, float(order.get("quantity", 0.0)))
        if quantity <= 0:
            skipped_orders.append({"order_id": order_id, "reason": "non_positive_quantity"})
            continue
        filled_quantity = round(quantity * fill_ratio, 6)
        if filled_quantity <= 0:
            skipped_orders.append({"order_id": order_id, "reason": "zero_fill_after_ratio"})
            continue

        side = normalize_order_side(order.get("side"))
        if side not in {"buy", "sell"}:
            skipped_orders.append({"order_id": order_id, "reason": "unsupported_side"})
            continue

        base_price = choose_base_price(order)
        filled_price = apply_slippage(base_price, side, slippage_bps)
        notional = filled_quantity * filled_price
        fee_usd = round(notional * fee_bps / 10000.0, 6)
        execution_status = "filled" if abs(filled_quantity - quantity) < 1e-9 else "submitted"

        upsert_order(updated_bundle.setdefault("orders", []), order, execution_status)
        execution_id = next_execution_id(execution_ids, order_id)
        simulation_tx_id = f"{simulation_id}_{order_id}_{len(execution_records) + 1:03d}"
        execution_record = {
            "id": execution_id,
            "order_id": order_id,
            "timestamp": now,
            "filled_quantity": round(filled_quantity, 6),
            "filled_price": round(filled_price, 6),
            "tx_hash": simulation_tx_id,
            "fee_usd": fee_usd,
        }
        updated_bundle.setdefault("executions", []).append(execution_record)
        execution_records.append(execution_record)

        realized_delta, touched = apply_execution_to_positions(
            positions=updated_bundle.setdefault("positions", []),
            position_index=position_index,
            position_ids=position_ids,
            portfolio_id=portfolio_id,
            market_id=str(order.get("market_id") or ""),
            outcome_id=str(order.get("outcome_id") or ""),
            side=side,
            quantity=filled_quantity,
            price=filled_price,
        )
        realized_pnl_usd += realized_delta
        for item in touched:
            position_updates[item["id"]] = item

        decision_record_id = str(order.get("decision_record_id") or "")
        decision = decisions_by_id.get(decision_record_id, {})
        execution_audit_trail.append(
            {
                "execution_id": execution_id,
                "order_id": order_id,
                "decision_record_id": decision_record_id,
                "evidence_refs": list(decision.get("evidence_refs") or []),
                "simulation_id": simulation_tx_id,
                "gate": order.get("gate"),
                "requires_human_approval": bool(order.get("requires_human_approval", False)),
            }
        )
        executed_orders.append(
            {
                "order_id": order_id,
                "decision_record_id": decision_record_id,
                "execution_id": execution_id,
                "filled_quantity": round(filled_quantity, 6),
                "filled_price": round(filled_price, 6),
                "notional_usd": round(notional, 6),
                "fee_usd": fee_usd,
                "order_status_after_simulation": execution_status,
            }
        )
        gross_notional_usd += notional
        total_fee_usd += fee_usd
        filled_order_count += 1

    refresh_position_marks(updated_bundle.get("positions", []))
    total_unrealized_pnl_usd = round(
        sum(float(item.get("unrealized_pnl", 0.0)) for item in updated_bundle.get("positions", [])),
        6,
    )
    open_positions = sum(1 for item in updated_bundle.get("positions", []) if item.get("status") == "open")
    closed_positions = sum(1 for item in updated_bundle.get("positions", []) if item.get("status") == "closed")

    return {
        "schema_version": "v0.1",
        "generated_at": now,
        "simulation_mode": "paper",
        "simulation_id": simulation_id,
        "portfolio_id": portfolio_id,
        "source_order_payload_generated_at": order_payload.get("generated_at"),
        "source_decision_payload_generated_at": decision_payload.get("generated_at"),
        "parameters": {
            "execute_proposed_orders": bool(execute_proposed_orders),
            "fill_ratio": round(fill_ratio, 6),
            "fee_bps": round(fee_bps, 6),
            "slippage_bps": round(slippage_bps, 6),
        },
        "executed_order_count": filled_order_count,
        "skipped_order_count": len(skipped_orders),
        "executed_orders": executed_orders,
        "skipped_orders": skipped_orders,
        "execution_records": execution_records,
        "execution_audit_trail": execution_audit_trail,
        "position_updates": sorted(position_updates.values(), key=lambda item: item["id"]),
        "pnl_summary": {
            "gross_notional_usd": round(gross_notional_usd, 6),
            "fee_usd": round(total_fee_usd, 6),
            "realized_pnl_usd": round(realized_pnl_usd, 6),
            "net_realized_pnl_usd": round(realized_pnl_usd - total_fee_usd, 6),
            "total_unrealized_pnl_usd": total_unrealized_pnl_usd,
            "open_positions": open_positions,
            "closed_positions": closed_positions,
        },
        "updated_execution_bundle": updated_bundle,
    }


def upsert_order(orders: list[dict[str, Any]], proposal: dict[str, Any], status: str) -> None:
    order_id = str(proposal.get("id") or "")
    for item in orders:
        if str(item.get("id")) == order_id:
            item["status"] = status
            return
    orders.append(
        {
            "id": order_id,
            "portfolio_id": str(proposal.get("portfolio_id") or ""),
            "market_id": str(proposal.get("market_id") or ""),
            "outcome_id": str(proposal.get("outcome_id") or ""),
            "side": normalize_order_side(proposal.get("side")),
            "order_type": str(proposal.get("order_type") or "limit"),
            "quantity": round(max(0.0, float(proposal.get("quantity", 0.0))), 6),
            "limit_price": normalize_limit_price(proposal.get("limit_price")),
            "status": status,
            "decision_record_id": str(proposal.get("decision_record_id") or ""),
        }
    )


def apply_execution_to_positions(
    positions: list[dict[str, Any]],
    position_index: dict[tuple[str, str, str, str], dict[str, Any]],
    position_ids: set[str],
    portfolio_id: str,
    market_id: str,
    outcome_id: str,
    side: str,
    quantity: float,
    price: float,
) -> tuple[float, list[dict[str, Any]]]:
    realized_pnl = 0.0
    touched: dict[str, dict[str, Any]] = {}
    qty_left = float(quantity)
    key_long = (portfolio_id, market_id, outcome_id, "long")
    key_short = (portfolio_id, market_id, outcome_id, "short")

    if side == "buy":
        short_pos = position_index.get(key_short)
        if short_pos and float(short_pos.get("size", 0.0)) > 0 and qty_left > 0:
            cover_qty = min(qty_left, float(short_pos.get("size", 0.0)))
            realized_pnl += (float(short_pos.get("avg_entry_price", 0.0)) - price) * cover_qty
            set_position_size(short_pos, float(short_pos.get("size", 0.0)) - cover_qty)
            short_pos["mark_price"] = round(price, 6)
            touched[short_pos["id"]] = snapshot_position(short_pos)
            qty_left -= cover_qty
        if qty_left > 0:
            long_pos = position_index.get(key_long)
            if long_pos is None:
                long_pos = create_position(
                    position_ids=position_ids,
                    portfolio_id=portfolio_id,
                    market_id=market_id,
                    outcome_id=outcome_id,
                    position_side="long",
                    entry_price=price,
                )
                positions.append(long_pos)
                position_index[key_long] = long_pos
            old_size = float(long_pos.get("size", 0.0))
            old_avg = float(long_pos.get("avg_entry_price", 0.0))
            new_size = old_size + qty_left
            new_avg = price if new_size <= 0 else ((old_size * old_avg) + (qty_left * price)) / new_size
            long_pos["avg_entry_price"] = round(new_avg, 6)
            long_pos["mark_price"] = round(price, 6)
            set_position_size(long_pos, new_size)
            touched[long_pos["id"]] = snapshot_position(long_pos)
    else:
        long_pos = position_index.get(key_long)
        if long_pos and float(long_pos.get("size", 0.0)) > 0 and qty_left > 0:
            reduce_qty = min(qty_left, float(long_pos.get("size", 0.0)))
            realized_pnl += (price - float(long_pos.get("avg_entry_price", 0.0))) * reduce_qty
            set_position_size(long_pos, float(long_pos.get("size", 0.0)) - reduce_qty)
            long_pos["mark_price"] = round(price, 6)
            touched[long_pos["id"]] = snapshot_position(long_pos)
            qty_left -= reduce_qty
        if qty_left > 0:
            short_pos = position_index.get(key_short)
            if short_pos is None:
                short_pos = create_position(
                    position_ids=position_ids,
                    portfolio_id=portfolio_id,
                    market_id=market_id,
                    outcome_id=outcome_id,
                    position_side="short",
                    entry_price=price,
                )
                positions.append(short_pos)
                position_index[key_short] = short_pos
            old_size = float(short_pos.get("size", 0.0))
            old_avg = float(short_pos.get("avg_entry_price", 0.0))
            new_size = old_size + qty_left
            new_avg = price if new_size <= 0 else ((old_size * old_avg) + (qty_left * price)) / new_size
            short_pos["avg_entry_price"] = round(new_avg, 6)
            short_pos["mark_price"] = round(price, 6)
            set_position_size(short_pos, new_size)
            touched[short_pos["id"]] = snapshot_position(short_pos)

    for item in touched.values():
        recompute_unrealized(item)
    return round(realized_pnl, 6), sorted(touched.values(), key=lambda item: item["id"])


def refresh_position_marks(positions: list[dict[str, Any]]) -> None:
    for item in positions:
        recompute_unrealized(item)


def recompute_unrealized(position: dict[str, Any]) -> None:
    size = float(position.get("size", 0.0))
    avg_entry = float(position.get("avg_entry_price", 0.0))
    mark = float(position.get("mark_price", 0.0))
    side = str(position.get("side") or "long")
    if side == "short":
        unrealized = (avg_entry - mark) * size
    else:
        unrealized = (mark - avg_entry) * size
    position["unrealized_pnl"] = round(unrealized, 6)
    if size <= 0:
        position["status"] = "closed"
        position["size"] = 0.0
        position["unrealized_pnl"] = 0.0
    else:
        position["status"] = "open"


def set_position_size(position: dict[str, Any], size: float) -> None:
    position["size"] = round(max(0.0, size), 6)


def snapshot_position(position: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(position.get("id") or ""),
        "portfolio_id": str(position.get("portfolio_id") or ""),
        "market_id": str(position.get("market_id") or ""),
        "outcome_id": str(position.get("outcome_id") or ""),
        "side": str(position.get("side") or "long"),
        "size": round(float(position.get("size", 0.0)), 6),
        "avg_entry_price": round(float(position.get("avg_entry_price", 0.0)), 6),
        "mark_price": round(float(position.get("mark_price", 0.0)), 6),
        "unrealized_pnl": round(float(position.get("unrealized_pnl", 0.0)), 6),
        "status": str(position.get("status") or "open"),
    }


def create_position(
    position_ids: set[str],
    portfolio_id: str,
    market_id: str,
    outcome_id: str,
    position_side: str,
    entry_price: float,
) -> dict[str, Any]:
    stem = f"pos_sim_{market_id}_{outcome_id}_{position_side}"
    position_id = stem
    suffix = 2
    while position_id in position_ids:
        position_id = f"{stem}_{suffix}"
        suffix += 1
    position_ids.add(position_id)
    return {
        "id": position_id,
        "portfolio_id": portfolio_id,
        "market_id": market_id,
        "outcome_id": outcome_id,
        "side": position_side,
        "size": 0.0,
        "avg_entry_price": round(entry_price, 6),
        "mark_price": round(entry_price, 6),
        "unrealized_pnl": 0.0,
        "status": "closed",
    }


def build_position_index(positions: list[dict[str, Any]]) -> dict[tuple[str, str, str, str], dict[str, Any]]:
    index: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for item in positions:
        key = (
            str(item.get("portfolio_id") or ""),
            str(item.get("market_id") or ""),
            str(item.get("outcome_id") or ""),
            str(item.get("side") or "long"),
        )
        index[key] = item
    return index


def choose_base_price(order: dict[str, Any]) -> float:
    price = order.get("limit_price")
    if isinstance(price, (int, float)) and price > 0:
        return float(price)
    return 0.5


def apply_slippage(price: float, side: str, slippage_bps: float) -> float:
    multiplier = 1.0 + (slippage_bps / 10000.0) if side == "buy" else 1.0 - (slippage_bps / 10000.0)
    return round(clamp(price * multiplier, 0.000001, 1.0), 6)


def normalize_limit_price(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return round(max(0.0, float(value)), 6)
    return None


def normalize_order_status(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    allowed = {"proposed", "approved", "submitted", "filled", "canceled", "rejected"}
    if normalized in allowed:
        return normalized
    return "proposed"


def normalize_order_side(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"buy", "sell"}:
        return normalized
    return "buy"


def next_execution_id(existing: set[str], order_id: str) -> str:
    base = f"exe_sim_{order_id}"
    execution_id = base
    suffix = 2
    while execution_id in existing:
        execution_id = f"{base}_{suffix}"
        suffix += 1
    existing.add(execution_id)
    return execution_id


def build_simulation_id(prefix: str, timestamp: str) -> str:
    compact = timestamp.replace(":", "").replace("-", "").replace("T", "_").replace("Z", "")
    return f"{prefix}_{compact}"


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(float(value), upper))


def utc_iso8601() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())

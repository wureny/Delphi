#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a benchmark trend report from recommendation-quality and execution-safety metrics."
    )
    parser.add_argument("--recommendation-quality", required=True, help="Path to recommendation-quality metrics JSON.")
    parser.add_argument("--execution-safety", required=True, help="Path to execution-safety metrics JSON.")
    parser.add_argument(
        "--history",
        help=(
            "Optional JSON history file path. If set, this run appends the latest snapshot and computes deltas against "
            "the previous snapshot."
        ),
    )
    parser.add_argument("--history-limit", type=int, default=50, help="Max snapshots retained in history.")
    parser.add_argument("--output", help="Optional path to write trend report JSON.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    recommendation_payload = json.loads(Path(args.recommendation_quality).read_text(encoding="utf-8"))
    execution_payload = json.loads(Path(args.execution_safety).read_text(encoding="utf-8"))
    report = generate_trend_report(
        recommendation_payload=recommendation_payload,
        execution_payload=execution_payload,
        history_path=args.history,
        history_limit=max(1, int(args.history_limit)),
    )
    text = json.dumps(report, indent=2 if args.pretty else None)
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
        print(f"[benchmark-trend] wrote {args.output}")
    else:
        print(text)
    return 0


def generate_trend_report(
    recommendation_payload: dict[str, Any],
    execution_payload: dict[str, Any],
    history_path: str | None,
    history_limit: int,
) -> dict[str, Any]:
    rec_metrics = recommendation_payload.get("metrics") or {}
    safe_metrics = execution_payload.get("metrics") or {}
    latest_snapshot = {
        "generated_at": utc_iso8601(),
        "runtime_engine": recommendation_payload.get("runtime_engine"),
        "session_id": recommendation_payload.get("session_id"),
        "recommendation_quality": rec_metrics,
        "execution_safety": safe_metrics,
    }

    history = []
    previous_snapshot = None
    if history_path:
        history_file = Path(history_path)
        history = load_history(history_file)
        if history:
            previous_snapshot = history[-1]
        history.append(latest_snapshot)
        history = history[-history_limit:]
        save_history(history_file, history)

    deltas = compute_deltas(previous_snapshot, latest_snapshot)
    report = {
        "schema_version": "v0.1",
        "generated_at": utc_iso8601(),
        "latest": latest_snapshot,
        "trend": {
            "has_previous": previous_snapshot is not None,
            "history_size": len(history) if history_path else 1,
            "deltas": deltas,
        },
        "history_path": history_path,
    }
    return report


def load_history(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise SystemExit("benchmark history must be a JSON array")
    return [item for item in payload if isinstance(item, dict)]


def save_history(path: Path, history: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")


def compute_deltas(previous: dict[str, Any] | None, latest: dict[str, Any]) -> dict[str, float]:
    if previous is None:
        return {}
    previous_flat = flatten_metrics(previous)
    latest_flat = flatten_metrics(latest)
    deltas: dict[str, float] = {}
    for key, latest_value in latest_flat.items():
        prev_value = previous_flat.get(key)
        if prev_value is None:
            continue
        deltas[key] = round(latest_value - prev_value, 6)
    return deltas


def flatten_metrics(snapshot: dict[str, Any]) -> dict[str, float]:
    flattened: dict[str, float] = {}
    rec = (snapshot.get("recommendation_quality") or {}) if isinstance(snapshot, dict) else {}
    safe = (snapshot.get("execution_safety") or {}) if isinstance(snapshot, dict) else {}
    for key, value in rec.items():
        metric = safe_float_or_none(value)
        if metric is None:
            continue
        flattened[f"recommendation_quality.{key}"] = metric
    for key, value in safe.items():
        metric = safe_float_or_none(value)
        if metric is None:
            continue
        flattened[f"execution_safety.{key}"] = metric
    return flattened


def safe_float_or_none(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return round(parsed, 6)


def utc_iso8601() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())

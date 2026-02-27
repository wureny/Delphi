#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Queue, apply, and summarize labels for archived live Polymarket cases.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    queue = subparsers.add_parser("queue", help="Export unlabeled cases into a labeling worklist.")
    queue.add_argument("--cases-dir", required=True, help="Path to the live-cases directory.")
    queue.add_argument("--output", help="Optional path to write the worklist JSON.")
    queue.add_argument("--include-labeled", action="store_true", help="Include already labeled cases in the exported worklist.")

    apply = subparsers.add_parser("apply", help="Apply labels from a JSON/CSV file or accept suggested labels.")
    apply.add_argument("--cases-dir", required=True, help="Path to the live-cases directory.")
    apply.add_argument("--labels", help="JSON or CSV file containing labels keyed by case_id.")
    apply.add_argument("--accept-suggested", action="store_true", help="Apply suggested_reference_probability to unlabeled cases.")
    apply.add_argument("--default-label-source", default="manual_review", help="Default label source when not provided by the input file.")
    apply.add_argument("--default-confidence", type=float, default=0.5, help="Default label confidence in [0,1].")

    summary = subparsers.add_parser("summary", help="Summarize label coverage for the live case library.")
    summary.add_argument("--cases-dir", required=True, help="Path to the live-cases directory.")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "queue":
        return run_queue(args)
    if args.command == "apply":
        return run_apply(args)
    if args.command == "summary":
        return run_summary(args)
    raise SystemExit(f"unsupported command: {args.command}")


def run_queue(args: argparse.Namespace) -> int:
    cases = load_cases(Path(args.cases_dir))
    worklist = []
    for entry in cases:
        benchmark_case = entry["benchmark_case"]
        if benchmark_case.get("reference_probability") is not None and not args.include_labeled:
            continue
        worklist.append(make_work_item(benchmark_case))
    payload = {
        "generated_at": utc_iso8601(),
        "cases_dir": str(Path(args.cases_dir)),
        "num_cases": len(worklist),
        "items": worklist,
    }
    if args.output:
        Path(args.output).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"[labels] wrote worklist with {len(worklist)} items to {args.output}")
    else:
        print(json.dumps(payload, indent=2))
    return 0


def run_apply(args: argparse.Namespace) -> int:
    if not args.labels and not args.accept_suggested:
        raise SystemExit("either --labels or --accept-suggested is required")
    cases = load_cases(Path(args.cases_dir))
    labels_by_case = load_labels(Path(args.labels)) if args.labels else {}
    updated = 0
    skipped = 0
    for entry in cases:
        benchmark_case = entry["benchmark_case"]
        case_path = entry["case_path"]
        case_id = benchmark_case["case_id"]
        label = labels_by_case.get(case_id)
        if label is None and args.accept_suggested:
            suggested = benchmark_case.get("suggested_reference_probability")
            if suggested is not None and benchmark_case.get("reference_probability") is None:
                label = {
                    "case_id": case_id,
                    "reference_probability": suggested,
                    "label_source": "suggested_seed",
                    "label_confidence": min(benchmark_case.get("microstructure_state", {}).get("book_reliability_score", 0.5), 0.75),
                    "label_notes": "Applied from suggested_reference_probability; verify manually.",
                }
        if label is None:
            skipped += 1
            continue
        apply_label(
            benchmark_case=benchmark_case,
            label=label,
            default_label_source=args.default_label_source,
            default_confidence=args.default_confidence,
        )
        write_case_files(case_path, benchmark_case)
        updated += 1
    print(f"[labels] updated={updated} skipped={skipped}")
    return 0


def run_summary(args: argparse.Namespace) -> int:
    cases = load_cases(Path(args.cases_dir))
    total = len(cases)
    labeled = 0
    unlabeled = 0
    avg_confidence_values = []
    sources: dict[str, int] = {}
    for entry in cases:
        benchmark_case = entry["benchmark_case"]
        metadata = benchmark_case.get("label_metadata") or {}
        if benchmark_case.get("reference_probability") is None:
            unlabeled += 1
            continue
        labeled += 1
        confidence = metadata.get("label_confidence")
        if isinstance(confidence, (int, float)):
            avg_confidence_values.append(float(confidence))
        source = str(metadata.get("label_source") or "unknown")
        sources[source] = sources.get(source, 0) + 1
    payload = {
        "cases_dir": str(Path(args.cases_dir)),
        "num_cases": total,
        "num_labeled": labeled,
        "num_unlabeled": unlabeled,
        "avg_label_confidence": round(sum(avg_confidence_values) / len(avg_confidence_values), 6) if avg_confidence_values else None,
        "label_sources": sources,
    }
    print(json.dumps(payload, indent=2))
    return 0


def load_cases(cases_dir: Path) -> list[dict[str, Any]]:
    cases = []
    for benchmark_path in sorted(cases_dir.rglob("benchmark-case.json")):
        benchmark_case = json.loads(benchmark_path.read_text(encoding="utf-8"))
        if not isinstance(benchmark_case, dict):
            continue
        cases.append({
            "case_path": benchmark_path.parent,
            "benchmark_path": benchmark_path,
            "benchmark_case": benchmark_case,
        })
    return cases


def make_work_item(benchmark_case: dict[str, Any]) -> dict[str, Any]:
    micro = benchmark_case.get("microstructure_state") or {}
    return {
        "case_id": benchmark_case["case_id"],
        "status": benchmark_case.get("status", "unknown"),
        "captured_at": benchmark_case.get("captured_at"),
        "event_title": benchmark_case.get("event_title"),
        "market_question": benchmark_case.get("market_question"),
        "outcome_id": benchmark_case.get("outcome_id"),
        "fallback_probability": benchmark_case.get("fallback_probability"),
        "reference_probability": benchmark_case.get("reference_probability"),
        "suggested_reference_probability": benchmark_case.get("suggested_reference_probability"),
        "displayed_probability": micro.get("displayed_probability"),
        "robust_probability": micro.get("robust_probability"),
        "book_reliability_score": micro.get("book_reliability_score"),
        "trade_reliability_score": micro.get("trade_reliability_score"),
        "manipulation_risk_score": micro.get("manipulation_risk_score"),
        "quote_trade_divergence": micro.get("quote_trade_divergence"),
        "explanatory_tags": micro.get("explanatory_tags", []),
        "label_template": {
            "case_id": benchmark_case["case_id"],
            "reference_probability": benchmark_case.get("suggested_reference_probability"),
            "label_source": "manual_review",
            "label_confidence": 0.5,
            "label_notes": "",
        },
    }


def load_labels(path: Path) -> dict[str, dict[str, Any]]:
    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            return {
                row["case_id"]: row
                for row in reader
                if row.get("case_id")
            }
    payload = json.loads(path.read_text(encoding="utf-8"))
    items: list[dict[str, Any]]
    if isinstance(payload, dict) and isinstance(payload.get("items"), list):
        items = [item for item in payload["items"] if isinstance(item, dict)]
    elif isinstance(payload, list):
        items = [item for item in payload if isinstance(item, dict)]
    else:
        raise SystemExit("labels file must be a JSON array or object containing an items array")
    return {item["case_id"]: item for item in items if item.get("case_id")}


def apply_label(
    benchmark_case: dict[str, Any],
    label: dict[str, Any],
    default_label_source: str,
    default_confidence: float,
) -> None:
    reference_probability = safe_probability(label.get("reference_probability"))
    benchmark_case["reference_probability"] = reference_probability
    benchmark_case["status"] = "labeled"
    benchmark_case["label_metadata"] = {
        "labeled_at": utc_iso8601(),
        "label_source": str(label.get("label_source") or default_label_source),
        "label_confidence": safe_confidence(label.get("label_confidence"), default_confidence),
        "label_notes": str(label.get("label_notes") or "").strip(),
    }


def write_case_files(case_path: Path, benchmark_case: dict[str, Any]) -> None:
    benchmark_path = case_path / "benchmark-case.json"
    benchmark_path.write_text(json.dumps(benchmark_case, indent=2) + "\n", encoding="utf-8")
    readme_path = case_path / "README.md"
    micro = benchmark_case.get("microstructure_state") or {}
    label_metadata = benchmark_case.get("label_metadata") or {}
    lines = [
        f"# {benchmark_case['case_id']}",
        "",
        f"- Event: {benchmark_case.get('event_title')}",
        f"- Market: {benchmark_case.get('market_question')}",
        f"- Outcome: {benchmark_case.get('outcome_id')}",
        f"- Captured At: {benchmark_case.get('captured_at')}",
        f"- Status: {benchmark_case.get('status')}",
        f"- Reference Probability: {benchmark_case.get('reference_probability')}",
        f"- Suggested Reference Probability: {benchmark_case.get('suggested_reference_probability')}",
        f"- Manipulation Risk: {micro.get('manipulation_risk_score')}",
        f"- Quote/Trade Divergence: {micro.get('quote_trade_divergence')}",
        f"- Tags: {', '.join(micro.get('explanatory_tags', []))}",
    ]
    if label_metadata:
        lines.extend(
            [
                f"- Label Source: {label_metadata.get('label_source')}",
                f"- Label Confidence: {label_metadata.get('label_confidence')}",
                f"- Label Notes: {label_metadata.get('label_notes')}",
            ]
        )
    else:
        lines.append("- Label Source: pending")
    lines.extend(["", "Edit `benchmark-case.json` or use `manage_live_case_labels.py apply` to update labels.", ""])
    readme_path.write_text("\n".join(lines), encoding="utf-8")


def safe_probability(value: Any) -> float:
    try:
        prob = float(value)
    except (TypeError, ValueError):
        raise SystemExit(f"invalid reference_probability: {value}")
    if not 0.0 <= prob <= 1.0:
        raise SystemExit(f"reference_probability must be within [0,1]: {value}")
    return prob


def safe_confidence(value: Any, default: float) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        confidence = default
    return max(0.0, min(1.0, confidence))


def utc_iso8601() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())

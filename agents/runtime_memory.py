#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def load_runtime_memory_store(path: str) -> dict[str, Any]:
    memory_path = Path(path)
    if not memory_path.exists():
        return {
            "schema_version": "v0.1",
            "updated_at": utc_iso8601(),
            "sessions": {},
        }
    payload = json.loads(memory_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit("runtime memory store must be a JSON object")
    sessions = payload.get("sessions")
    if not isinstance(sessions, dict):
        payload["sessions"] = {}
    payload.setdefault("schema_version", "v0.1")
    payload.setdefault("updated_at", utc_iso8601())
    return payload


def save_runtime_memory_store(path: str, store: dict[str, Any]) -> None:
    memory_path = Path(path)
    memory_path.parent.mkdir(parents=True, exist_ok=True)
    store["updated_at"] = utc_iso8601()
    memory_path.write_text(json.dumps(store, indent=2) + "\n", encoding="utf-8")


def get_session_memory(store: dict[str, Any], session_id: str) -> dict[str, Any]:
    sessions = store.setdefault("sessions", {})
    session = sessions.get(session_id)
    if not isinstance(session, dict):
        return {}
    return session


def build_memory_context(
    session_memory: dict[str, Any],
    market_id: str | None = None,
    outcome_id: str | None = None,
) -> dict[str, Any]:
    if not isinstance(session_memory, dict) or not session_memory:
        return {}
    recent_decisions = list(session_memory.get("recent_candidate_decisions") or [])
    scoped = []
    if market_id:
        for item in recent_decisions:
            if str(item.get("market_id")) != str(market_id):
                continue
            if outcome_id is not None and str(item.get("outcome_id")) != str(outcome_id):
                continue
            scoped.append(item)
    return {
        "run_count": int(session_memory.get("run_count", 0)),
        "last_runtime_engine": session_memory.get("last_runtime_engine"),
        "last_run_at": session_memory.get("last_run_at"),
        "recent_risk_reasons": list(session_memory.get("recent_risk_reasons") or []),
        "recent_candidate_decisions": recent_decisions,
        "scoped_recent_decisions": scoped,
        "recent_research_summaries": list(session_memory.get("recent_research_summaries") or []),
    }


def update_session_memory(
    store: dict[str, Any],
    session_id: str,
    runtime_engine: str,
    runtime_context: dict[str, Any],
    max_decisions: int,
    max_summaries: int,
    max_risk_reasons: int = 30,
) -> dict[str, Any]:
    sessions = store.setdefault("sessions", {})
    session = sessions.get(session_id)
    if not isinstance(session, dict):
        session = {}
        sessions[session_id] = session

    previous_run_count = int(session.get("run_count", 0))
    session["run_count"] = previous_run_count + 1
    session["last_runtime_engine"] = runtime_engine
    session["last_run_at"] = utc_iso8601()

    incoming_decisions = []
    for item in runtime_context.get("candidate_decisions", []):
        if not isinstance(item, dict):
            continue
        incoming_decisions.append(
            {
                "decision_id": str(item.get("decision_id") or ""),
                "market_id": str(item.get("market_id") or ""),
                "outcome_id": str(item.get("outcome_id") or ""),
                "proposed_action": str(item.get("proposed_action") or ""),
                "confidence": safe_float(item.get("confidence")),
                "risk_gate": str(item.get("risk_gate") or ""),
                "created_by_agent": str(item.get("created_by_agent") or ""),
            }
        )
    session["recent_candidate_decisions"] = trim_recent(
        merge_by_key(
            existing=list(session.get("recent_candidate_decisions") or []),
            incoming=incoming_decisions,
            key_fn=lambda row: (
                str(row.get("market_id") or ""),
                str(row.get("outcome_id") or ""),
                str(row.get("decision_id") or ""),
            ),
        ),
        max_decisions,
    )

    incoming_summaries = []
    for item in runtime_context.get("research_agent_results", []):
        if not isinstance(item, dict):
            continue
        incoming_summaries.append(
            {
                "market_id": str(item.get("market_id") or ""),
                "summary": str(item.get("summary") or ""),
                "response_mode": str(item.get("response_mode") or ""),
            }
        )
    session["recent_research_summaries"] = trim_recent(
        merge_by_key(
            existing=list(session.get("recent_research_summaries") or []),
            incoming=incoming_summaries,
            key_fn=lambda row: (
                str(row.get("market_id") or ""),
                str(row.get("summary") or ""),
            ),
        ),
        max_summaries,
    )

    reasons = list(session.get("recent_risk_reasons") or [])
    seen = {str(item) for item in reasons}
    for row in runtime_context.get("risk_agent_results", []):
        for reason in row.get("risk_reasons", []) if isinstance(row, dict) else []:
            text = str(reason).strip()
            if not text or text in seen:
                continue
            reasons.append(text)
            seen.add(text)
    session["recent_risk_reasons"] = trim_recent(reasons, max_risk_reasons)

    return {
        "enabled": True,
        "path": None,
        "source_run_count": previous_run_count,
        "updated_run_count": session["run_count"],
        "decision_memory_size": len(session.get("recent_candidate_decisions", [])),
        "summary_memory_size": len(session.get("recent_research_summaries", [])),
        "risk_reason_memory_size": len(session.get("recent_risk_reasons", [])),
    }


def merge_by_key(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
    key_fn: Any,
) -> list[dict[str, Any]]:
    merged = [row for row in existing if isinstance(row, dict)]
    index = {key_fn(row): i for i, row in enumerate(merged)}
    for row in incoming:
        key = key_fn(row)
        if key in index:
            merged[index[key]] = row
        else:
            index[key] = len(merged)
            merged.append(row)
    return merged


def trim_recent(items: list[Any], size: int) -> list[Any]:
    if size <= 0:
        return []
    if len(items) <= size:
        return list(items)
    return list(items[-size:])


def safe_float(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return round(parsed, 6)


def utc_iso8601() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

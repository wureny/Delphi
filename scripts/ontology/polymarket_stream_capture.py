#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import socket
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fetch_polymarket_public_snapshot import SUPPORTED_CATEGORIES, fetch_public_snapshot, write_json
from polymarket_mapper import PolymarketMapper
from polymarket_ws_client import MinimalWebSocketClient

WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"


@dataclass
class SegmentWriter:
    base_dir: Path
    max_artifacts_per_segment: int
    max_messages_per_segment: int
    segment_index: int = 0
    artifacts_in_segment: int = 0
    messages_in_segment: int = 0

    def __post_init__(self) -> None:
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._segment_dir().mkdir(parents=True, exist_ok=True)
        (self._segment_dir() / "rolling").mkdir(parents=True, exist_ok=True)

    def append_messages(self, messages: list[dict[str, Any]]) -> None:
        if not messages:
            return
        if self.messages_in_segment and self.messages_in_segment + len(messages) > self.max_messages_per_segment:
            self._rotate_segment()
        path = self._segment_dir() / "captured-messages.jsonl"
        with path.open("a", encoding="utf-8") as handle:
            for message in messages:
                handle.write(json.dumps(message) + "\n")
        self.messages_in_segment += len(messages)

    def write_artifact(self, artifact: dict[str, Any]) -> Path:
        if self.artifacts_in_segment >= self.max_artifacts_per_segment:
            self._rotate_segment()
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        path = self._segment_dir() / "rolling" / f"rolling-bundle-{self.artifacts_in_segment + 1:03d}-{timestamp}.json"
        write_json(path, artifact)
        self.artifacts_in_segment += 1
        return path

    def manifest(self) -> list[dict[str, Any]]:
        entries = []
        for segment_dir in sorted((self.base_dir).glob("segment-*")):
            rolling_dir = segment_dir / "rolling"
            entries.append(
                {
                    "segment": segment_dir.name,
                    "captured_messages_path": str(segment_dir / "captured-messages.jsonl"),
                    "num_artifacts": len(list(rolling_dir.glob("rolling-bundle-*.json"))) if rolling_dir.exists() else 0,
                }
            )
        return entries

    def _rotate_segment(self) -> None:
        self.segment_index += 1
        self.artifacts_in_segment = 0
        self.messages_in_segment = 0
        self._segment_dir().mkdir(parents=True, exist_ok=True)
        (self._segment_dir() / "rolling").mkdir(parents=True, exist_ok=True)

    def _segment_dir(self) -> Path:
        return self.base_dir / f"segment-{self.segment_index:03d}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture Polymarket market-channel data and emit rolling ontology bundles.")
    parser.add_argument("--output-dir", required=True, help="Directory to write rolling bundles and captured messages.")
    parser.add_argument("--duration-seconds", type=int, default=60, help="How long to capture live websocket traffic.")
    parser.add_argument("--flush-every-seconds", type=int, default=15, help="How often to emit rolling bundles in live mode.")
    parser.add_argument("--flush-every-messages", type=int, default=10, help="How often to emit rolling bundles in replay mode.")
    parser.add_argument("--window-seconds", type=int, default=0, help="Rolling window size in seconds. 0 keeps all messages in the active bundle.")
    parser.add_argument("--limit-events", type=int, default=10, help="Maximum number of events for the initial live snapshot.")
    parser.add_argument("--category", action="append", choices=sorted(SUPPORTED_CATEGORIES), help="Repeatable category filter.")
    parser.add_argument("--include-closed", action="store_true", help="Include closed events and markets in the initial live snapshot.")
    parser.add_argument("--max-messages", type=int, default=500, help="Maximum number of live websocket messages to keep.")
    parser.add_argument("--max-artifacts-per-segment", type=int, default=50, help="Rotate to a new segment after this many rolling artifacts.")
    parser.add_argument("--max-messages-per-segment", type=int, default=5000, help="Rotate to a new segment after this many raw messages are persisted.")
    parser.add_argument("--replay-messages", help="Replay a recorded market-channel JSON file instead of connecting live.")
    parser.add_argument("--gamma-events", help="Gamma events JSON file used in replay mode.")
    parser.add_argument("--news-signals", help="Optional news signals JSON file used in replay mode.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.replay_messages:
        return run_replay_mode(args, output_dir)
    return run_live_mode(args, output_dir)


def run_live_mode(args: argparse.Namespace, output_dir: Path) -> int:
    categories = set(args.category or SUPPORTED_CATEGORIES)
    snapshot = fetch_public_snapshot(
        limit_events=args.limit_events,
        categories=categories,
        include_closed=args.include_closed,
    )
    gamma_events = snapshot["events"]
    news_signals = snapshot["news_signals"]
    buffered_messages = list(snapshot["clob_messages"])
    token_ids = snapshot["token_ids"]

    write_json(output_dir / "initial-gamma-events.json", gamma_events)
    write_json(output_dir / "initial-news-signals.json", news_signals)
    write_json(output_dir / "captured-messages.json", buffered_messages)

    segments_dir = output_dir / "segments"
    segment_writer = SegmentWriter(
        base_dir=segments_dir,
        max_artifacts_per_segment=max(args.max_artifacts_per_segment, 1),
        max_messages_per_segment=max(args.max_messages_per_segment, 1),
    )
    segment_writer.append_messages(buffered_messages)
    mapper = PolymarketMapper()

    if not token_ids:
        active_messages = rolling_window_messages(buffered_messages, args.window_seconds)
        write_artifact_bundle(segment_writer, mapper, gamma_events, news_signals, active_messages, artifact_index=1)
        write_summary(output_dir, mode="live", num_messages=len(buffered_messages), num_active_messages=len(active_messages), window_seconds=args.window_seconds, segment_writer=segment_writer)
        print("[stream] no token_ids found in initial snapshot; wrote initial rolling bundle only")
        return 0

    client = MinimalWebSocketClient(WS_URL)
    captured_live = 0
    artifact_index = 0
    next_flush = time.time() + args.flush_every_seconds
    started = time.time()
    try:
        client.connect()
        client.send_json({"assets_ids": token_ids, "type": "market"})
        while True:
            now = time.time()
            if now - started >= args.duration_seconds:
                break
            if captured_live >= args.max_messages:
                break
            try:
                raw_text = client.recv_text()
            except socket.timeout:
                continue
            payload = json.loads(raw_text)
            normalized_messages = normalize_ws_payload(payload)
            if not normalized_messages:
                continue
            buffered_messages.extend(normalized_messages)
            segment_writer.append_messages(normalized_messages)
            captured_live += len(normalized_messages)
            if time.time() >= next_flush:
                artifact_index += 1
                active_messages = rolling_window_messages(buffered_messages, args.window_seconds)
                buffered_messages = active_messages
                write_artifact_bundle(segment_writer, mapper, gamma_events, news_signals, active_messages, artifact_index)
                next_flush = time.time() + args.flush_every_seconds
    finally:
        client.close()

    write_json(output_dir / "captured-messages.json", buffered_messages)
    artifact_index += 1
    active_messages = rolling_window_messages(buffered_messages, args.window_seconds)
    write_artifact_bundle(segment_writer, mapper, gamma_events, news_signals, active_messages, artifact_index)
    write_summary(output_dir, mode="live", num_messages=captured_live + len(snapshot["clob_messages"]), num_active_messages=len(active_messages), window_seconds=args.window_seconds, segment_writer=segment_writer)
    print(f"[stream] captured {captured_live} live websocket messages; rolling_artifacts={artifact_index}")
    return 0


def run_replay_mode(args: argparse.Namespace, output_dir: Path) -> int:
    if not args.gamma_events:
        raise SystemExit("--gamma-events is required in replay mode")
    gamma_events = json.loads(Path(args.gamma_events).read_text(encoding="utf-8"))
    messages = json.loads(Path(args.replay_messages).read_text(encoding="utf-8"))
    if not isinstance(messages, list):
        raise SystemExit("replay messages must be a JSON array")
    news_signals: Any = []
    if args.news_signals:
        news_signals = json.loads(Path(args.news_signals).read_text(encoding="utf-8"))

    segments_dir = output_dir / "segments"
    segment_writer = SegmentWriter(
        base_dir=segments_dir,
        max_artifacts_per_segment=max(args.max_artifacts_per_segment, 1),
        max_messages_per_segment=max(args.max_messages_per_segment, 1),
    )
    mapper = PolymarketMapper()
    buffered_messages: list[dict[str, Any]] = []
    artifact_index = 0

    for message in messages:
        if not isinstance(message, dict):
            continue
        buffered_messages.append(message)
        segment_writer.append_messages([message])
        if len(buffered_messages) % max(args.flush_every_messages, 1) == 0:
            artifact_index += 1
            active_messages = rolling_window_messages(buffered_messages, args.window_seconds, reference_timestamp=message.get("timestamp"))
            buffered_messages = active_messages
            write_artifact_bundle(segment_writer, mapper, gamma_events, news_signals, active_messages, artifact_index)

    if buffered_messages and len(messages) % max(args.flush_every_messages, 1) != 0:
        artifact_index += 1
        active_messages = rolling_window_messages(buffered_messages, args.window_seconds)
        buffered_messages = active_messages
        write_artifact_bundle(segment_writer, mapper, gamma_events, news_signals, active_messages, artifact_index)

    write_json(output_dir / "captured-messages.json", buffered_messages)
    write_json(output_dir / "initial-gamma-events.json", gamma_events)
    write_json(output_dir / "initial-news-signals.json", news_signals)
    write_summary(output_dir, mode="replay", num_messages=len(messages), num_active_messages=len(buffered_messages), window_seconds=args.window_seconds, segment_writer=segment_writer)
    print(f"[stream] replayed {len(messages)} messages; rolling_artifacts={artifact_index}")
    return 0


def write_artifact_bundle(
    segment_writer: SegmentWriter,
    mapper: PolymarketMapper,
    gamma_events: Any,
    news_signals: Any,
    active_messages: list[dict[str, Any]],
    artifact_index: int,
) -> Path:
    bundle = mapper.build_bundle(gamma_payload=gamma_events, clob_payload=active_messages, news_payload=news_signals)
    artifact = {
        "artifact_index": artifact_index,
        "generated_at": bundle["generated_at"],
        "num_messages": len(active_messages),
        "bundle": bundle,
    }
    return segment_writer.write_artifact(artifact)


def rolling_window_messages(
    messages: list[dict[str, Any]],
    window_seconds: int,
    reference_timestamp: Any | None = None,
) -> list[dict[str, Any]]:
    if window_seconds <= 0:
        return list(messages)
    reference_epoch = parse_timestamp(reference_timestamp) if reference_timestamp is not None else None
    if reference_epoch is None:
        for message in reversed(messages):
            reference_epoch = parse_timestamp(message.get("timestamp"))
            if reference_epoch is not None:
                break
    if reference_epoch is None:
        return list(messages)
    cutoff = reference_epoch - window_seconds
    kept: list[dict[str, Any]] = []
    undated: list[dict[str, Any]] = []
    for message in messages:
        message_epoch = parse_timestamp(message.get("timestamp"))
        if message_epoch is None:
            undated.append(message)
            continue
        if message_epoch >= cutoff:
            kept.append(message)
    return undated + kept


def parse_timestamp(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        timestamp = float(value)
        return timestamp / 1000.0 if timestamp > 1_000_000_000_000 else timestamp
    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        return parse_timestamp(int(text))
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text).timestamp()
    except ValueError:
        return None


def normalize_ws_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        if isinstance(payload.get("data"), list):
            return [item for item in payload["data"] if isinstance(item, dict)]
        return [payload]
    return []


def write_summary(
    output_dir: Path,
    mode: str,
    num_messages: int,
    num_active_messages: int,
    window_seconds: int,
    segment_writer: SegmentWriter,
) -> None:
    manifest = segment_writer.manifest()
    write_json(output_dir / "segment-manifest.json", manifest)
    write_json(
        output_dir / "stream-summary.json",
        {
            "mode": mode,
            "num_messages": num_messages,
            "num_active_messages": num_active_messages,
            "window_seconds": window_seconds,
            "num_segments": len(manifest),
            "segments": manifest,
        },
    )


if __name__ == "__main__":
    raise SystemExit(main())

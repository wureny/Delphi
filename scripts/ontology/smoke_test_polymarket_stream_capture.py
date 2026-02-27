#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    script = root / "scripts/ontology/polymarket_stream_capture.py"
    gamma_path = root / "ontology/samples/raw/polymarket-gamma-events-sample.json"
    replay_messages = root / "ontology/samples/raw/polymarket-clob-market-channel-sample.json"
    news_path = root / "ontology/samples/raw/polymarket-news-signals-sample.json"

    with tempfile.TemporaryDirectory() as tmpdir:
        output_dir = Path(tmpdir) / "stream-capture"
        subprocess.run(
            [
                "python3",
                str(script),
                "--output-dir",
                str(output_dir),
                "--replay-messages",
                str(replay_messages),
                "--gamma-events",
                str(gamma_path),
                "--news-signals",
                str(news_path),
                "--flush-every-messages",
                "2",
            ],
            check=True,
        )
        summary = json.loads((output_dir / "stream-summary.json").read_text(encoding="utf-8"))
        manifest = json.loads((output_dir / "segment-manifest.json").read_text(encoding="utf-8"))
        rolling_files = sorted((output_dir / "segments").glob("segment-*/rolling/rolling-bundle-*.json"))
        if summary["mode"] != "replay":
            raise SystemExit("unexpected stream mode in replay smoke test")
        if summary["num_segments"] <= 0 or not manifest:
            raise SystemExit("expected at least one persisted segment")
        if not rolling_files:
            raise SystemExit("no rolling bundle artifacts were produced")
        latest = json.loads(rolling_files[-1].read_text(encoding="utf-8"))
        if not latest["bundle"]["market_microstructure_states"]:
            raise SystemExit("rolling bundle is missing microstructure states")

    print("[smoke-test] stream capture replay pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

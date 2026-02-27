#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
from pathlib import Path

from polymarket_mapper import PolymarketMapper


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    gamma_path = root / "ontology/samples/raw/polymarket-gamma-events-sample.json"
    clob_path = root / "ontology/samples/raw/polymarket-clob-market-channel-sample.json"
    news_path = root / "ontology/samples/raw/polymarket-news-signals-sample.json"

    mapper = PolymarketMapper()
    bundle = mapper.build_bundle_from_paths(gamma_path=gamma_path, clob_path=clob_path, news_path=news_path)

    required_top_level = {
        "schema_version",
        "generated_at",
        "sources",
        "events",
        "markets",
        "outcomes",
        "price_points",
        "order_book_snapshots",
        "trade_prints",
        "liquidity_snapshots",
        "news_signals",
        "resolution_states",
        "market_microstructure_states",
    }
    missing = sorted(required_top_level - set(bundle))
    if missing:
        raise SystemExit(f"missing top-level fields: {missing}")

    if not bundle["events"] or not bundle["markets"] or not bundle["market_microstructure_states"]:
        raise SystemExit("bundle is missing required mapped entities")

    for state in bundle["market_microstructure_states"]:
        for field in (
            "displayed_probability",
            "robust_probability",
            "book_reliability_score",
            "trade_reliability_score",
            "manipulation_risk_score",
        ):
            value = state[field]
            if not 0.0 <= value <= 1.0:
                raise SystemExit(f"{field} out of bounds for state {state['id']}: {value}")
        weight_total = sum(state["signal_weights"].values())
        if abs(weight_total - 1.0) > 1e-6:
            raise SystemExit(f"signal_weights must sum to 1.0 for state {state['id']}: {weight_total}")

    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = Path(tmpdir) / "bundle.json"
        output_path.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")
        json.loads(output_path.read_text(encoding="utf-8"))

    print(
        "[smoke-test] pass "
        f"events={len(bundle['events'])} markets={len(bundle['markets'])} "
        f"trades={len(bundle['trade_prints'])} microstructure_states={len(bundle['market_microstructure_states'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

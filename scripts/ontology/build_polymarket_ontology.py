#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from polymarket_mapper import PolymarketMapper


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a Delphi Polymarket ontology bundle from Gamma and CLOB inputs.")
    parser.add_argument("--gamma-events", required=True, help="Path to the Gamma events JSON payload.")
    parser.add_argument("--clob-messages", required=True, help="Path to the CLOB market-channel JSON payload.")
    parser.add_argument("--news-signals", help="Optional path to external news signal JSON payload.")
    parser.add_argument("--output", required=True, help="Path to write the ontology bundle JSON.")
    parser.add_argument("--generated-at", help="Override generated_at timestamp in ISO8601 format.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    mapper = PolymarketMapper()
    bundle = mapper.build_bundle_from_paths(
        gamma_path=Path(args.gamma_events),
        clob_path=Path(args.clob_messages),
        news_path=Path(args.news_signals) if args.news_signals else None,
        generated_at=args.generated_at,
    )
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    indent = 2 if args.pretty else None
    output_path.write_text(json.dumps(bundle, indent=indent, sort_keys=False) + "\n", encoding="utf-8")
    print(f"[ontology] Wrote bundle to {output_path}")
    print(
        "[ontology] Counts: "
        f"events={len(bundle['events'])} "
        f"markets={len(bundle['markets'])} "
        f"outcomes={len(bundle['outcomes'])} "
        f"order_book_snapshots={len(bundle['order_book_snapshots'])} "
        f"trade_prints={len(bundle['trade_prints'])} "
        f"microstructure_states={len(bundle['market_microstructure_states'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

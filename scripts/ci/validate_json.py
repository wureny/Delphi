#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    json_files = [
        p
        for p in root.rglob("*.json")
        if ".git" not in p.parts
    ]

    if not json_files:
        print("[CI] No JSON files found.")
        return 0

    failed = []
    for path in sorted(json_files):
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            failed.append((path, str(exc)))

    if failed:
        print("[CI][ERROR] JSON validation failed:")
        for path, err in failed:
            print(f"  - {path}: {err}")
        return 1

    print(f"[CI] JSON validation passed ({len(json_files)} files).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

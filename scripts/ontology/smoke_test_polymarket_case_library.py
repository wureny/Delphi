#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    script = root / "scripts/ontology/capture_polymarket_case_library.py"
    source_dir = root / "ontology/samples/raw"

    with tempfile.TemporaryDirectory() as tmpdir:
        output_dir = Path(tmpdir) / "case-library"
        subprocess.run(
            [
                "python3",
                str(script),
                "--output-dir",
                str(output_dir),
                "--iterations",
                "1",
                "--source-dir",
                str(source_dir),
                "--risk-threshold",
                "0.5",
            ],
            check=True,
        )
        index = json.loads((output_dir / "case-library-index.json").read_text(encoding="utf-8"))
        if not isinstance(index, list):
            raise SystemExit("case library index is not a list")
        if not index:
            raise SystemExit("expected at least one archived case from sample input")
        case_dir = Path(index[0]["case_dir"])
        benchmark_case = json.loads((case_dir / "benchmark-case.json").read_text(encoding="utf-8"))
        if benchmark_case.get("suggested_reference_probability") is None:
            raise SystemExit("expected suggested_reference_probability in archived benchmark case")

    print("[smoke-test] case library capture pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    capture_script = root / "scripts/ontology/capture_polymarket_case_library.py"
    label_script = root / "scripts/ontology/manage_live_case_labels.py"
    source_dir = root / "ontology/samples/raw"

    with tempfile.TemporaryDirectory() as tmpdir:
        output_dir = Path(tmpdir) / "case-library"
        subprocess.run(
            [
                "python3",
                str(capture_script),
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
        cases_dir = output_dir / "live-cases"
        worklist_path = output_dir / "label-worklist.json"
        subprocess.run(
            [
                "python3",
                str(label_script),
                "queue",
                "--cases-dir",
                str(cases_dir),
                "--output",
                str(worklist_path),
            ],
            check=True,
        )
        worklist = json.loads(worklist_path.read_text(encoding="utf-8"))
        if worklist["num_cases"] <= 0:
            raise SystemExit("expected at least one unlabeled work item")
        subprocess.run(
            [
                "python3",
                str(label_script),
                "apply",
                "--cases-dir",
                str(cases_dir),
                "--accept-suggested",
            ],
            check=True,
        )
        summary = json.loads(
            subprocess.check_output(
                [
                    "python3",
                    str(label_script),
                    "summary",
                    "--cases-dir",
                    str(cases_dir),
                ],
                text=True,
            )
        )
        if summary["num_labeled"] <= 0:
            raise SystemExit("expected labeled live cases after applying suggested labels")

    print("[smoke-test] live case labels pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

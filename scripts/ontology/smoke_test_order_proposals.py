#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    script = root / 'scripts/ontology/build_order_proposals.py'
    decision_records = root / 'ontology/samples/execution-derived/decision-records-sample.json'
    gate_report = root / 'ontology/samples/execution-derived/risk-gate-report-sample.json'
    execution_bundle = root / 'ontology/samples/fund-execution-sample-bundle.json'
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / 'order-proposals.json'
        subprocess.run([
            'python3', str(script),
            '--decision-records', str(decision_records),
            '--risk-gate-report', str(gate_report),
            '--execution-bundle', str(execution_bundle),
            '--output', str(output),
            '--pretty',
        ], check=True)
        payload = json.loads(output.read_text(encoding='utf-8'))
        orders = payload.get('orders', [])
        skipped = payload.get('skipped_decisions', [])
        if not orders and not skipped:
            raise SystemExit('expected order proposals or skipped decisions')
        if any(item['status'] not in {'approved', 'proposed', 'rejected'} for item in orders):
            raise SystemExit('unexpected order proposal status')
    print('[smoke-test] order proposals pass')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

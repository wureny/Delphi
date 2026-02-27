#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    script = root / 'scripts/ontology/build_decision_records.py'
    agent_context = root / 'ontology/samples/multi-agent/polymarket-agent-context-sample.json'
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / 'decision-records.json'
        subprocess.run(['python3', str(script), '--agent-context', str(agent_context), '--output', str(output), '--pretty', '--include-hold'], check=True)
        payload = json.loads(output.read_text(encoding='utf-8'))
        records = payload.get('decision_records', [])
        if not records:
            raise SystemExit('expected decision records')
        required = {'id', 'market_id', 'outcome_id', 'thesis', 'confidence', 'evidence_refs', 'proposed_action', 'created_at', 'created_by_agent'}
        missing = sorted(required - set(records[0]))
        if missing:
            raise SystemExit(f'missing decision record fields: {missing}')
    print('[smoke-test] decision records pass')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

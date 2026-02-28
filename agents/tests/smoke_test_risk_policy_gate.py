#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    script = root / 'agents/evaluate_risk_policy_gate.py'
    agent_context = root / 'ontology/samples/multi-agent/polymarket-agent-context-sample.json'
    execution_bundle = root / 'ontology/samples/fund-execution-sample-bundle.json'
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / 'risk-gate.json'
        subprocess.run([
            'python3', str(script),
            '--agent-context', str(agent_context),
            '--execution-bundle', str(execution_bundle),
            '--output', str(output),
            '--pretty',
            '--include-hold',
        ], check=True)
        payload = json.loads(output.read_text(encoding='utf-8'))
        results = payload.get('gate_results', [])
        if not results:
            raise SystemExit('expected gate results')
        if any(item['gate'] not in {'allow', 'review', 'block'} for item in results):
            raise SystemExit('unexpected gate value')
    print('[smoke-test] risk policy gate pass')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

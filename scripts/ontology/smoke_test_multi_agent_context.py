#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    script = root / 'scripts/ontology/build_multi_agent_context.py'
    bundle = root / 'ontology/samples/polymarket-sample-bundle.json'
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / 'agent-context.json'
        subprocess.run(['python3', str(script), '--bundle', str(bundle), '--output', str(output), '--pretty'], check=True)
        payload = json.loads(output.read_text(encoding='utf-8'))
        required = {
            'research_agent_packets',
            'strategy_agent_packets',
            'risk_agent_packets',
            'audit_agent_packets',
            'candidate_decisions',
        }
        if missing := sorted(required - set(payload)):
            raise SystemExit(f'missing keys: {missing}')
        if not payload['candidate_decisions']:
            raise SystemExit('expected candidate decisions')
        if any(item['risk_gate'] not in {'allow', 'caution', 'block'} for item in payload['risk_agent_packets']):
            raise SystemExit('unexpected risk gate value')
    print('[smoke-test] multi-agent context pass')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

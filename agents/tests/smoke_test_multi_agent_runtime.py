#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    script = root / 'agents/run_multi_agent_runtime.py'
    agent_context = root / 'ontology/samples/multi-agent/polymarket-agent-context-sample.json'
    execution_bundle = root / 'ontology/samples/fund-execution-sample-bundle.json'
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / 'runtime-output.json'
        subprocess.run(
            [
                'python3',
                str(script),
                '--agent-context',
                str(agent_context),
                '--execution-bundle',
                str(execution_bundle),
                '--output',
                str(output),
                '--pretty',
                '--include-hold',
            ],
            check=True,
        )
        payload = json.loads(output.read_text(encoding='utf-8'))
        required = {
            'runtime_agent_context',
            'decision_records_payload',
            'risk_gate_payload',
            'order_proposals_payload',
            'orchestration_trace',
        }
        if missing := sorted(required - set(payload)):
            raise SystemExit(f'missing runtime output sections: {missing}')
        decisions = payload['runtime_agent_context'].get('candidate_decisions', [])
        if not decisions:
            raise SystemExit('expected runtime candidate decisions')
        records = payload['decision_records_payload'].get('decision_records', [])
        if not records:
            raise SystemExit('expected runtime decision records')
        gates = payload['risk_gate_payload'].get('gate_results', [])
        if not gates:
            raise SystemExit('expected runtime gate results')
    print('[smoke-test] multi-agent runtime pass')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

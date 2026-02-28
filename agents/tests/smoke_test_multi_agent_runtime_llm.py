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
    mock_responses = root / 'ontology/samples/multi-agent/llm-mock-responses-sample.json'
    with tempfile.TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / 'runtime-output-llm.json'
        subprocess.run(
            [
                'python3',
                str(script),
                '--agent-context',
                str(agent_context),
                '--execution-bundle',
                str(execution_bundle),
                '--runtime-engine',
                'llm',
                '--llm-mock-responses',
                str(mock_responses),
                '--output',
                str(output),
                '--pretty',
                '--include-hold',
            ],
            check=True,
        )
        payload = json.loads(output.read_text(encoding='utf-8'))
        if payload.get('runtime_engine') != 'llm':
            raise SystemExit('expected llm runtime engine')
        runtime_context = payload.get('runtime_agent_context') or {}
        metadata = runtime_context.get('runtime_metadata') or {}
        llm_stats = metadata.get('llm') or {}
        if llm_stats.get('llm_mock_count', 0) <= 0:
            raise SystemExit('expected llm mock responses to be consumed')
        decisions = runtime_context.get('candidate_decisions') or []
        if not decisions:
            raise SystemExit('expected runtime candidate decisions')
        strategy_results = runtime_context.get('strategy_agent_results') or []
        if not strategy_results:
            raise SystemExit('expected strategy agent results')
        if any(item.get('response_mode') not in {'mock', 'live', 'fallback_on_error', 'heuristic'} for item in strategy_results):
            raise SystemExit('unexpected strategy response_mode')
    print('[smoke-test] multi-agent llm runtime pass')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

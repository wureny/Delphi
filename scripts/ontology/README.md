# Polymarket Ontology Pipeline

This directory contains the executable Polymarket ontology pipeline for Delphi.

Agent-oriented implementations now live under `agents/`. The agent-related files in this folder are compatibility wrappers so existing commands keep working.
Primary agent smoke tests now live under `agents/tests/`; this folder keeps wrapper smoke tests for backward compatibility.

## Files
- `build_polymarket_ontology.py`: build a bundle from local raw JSON inputs.
- `build_multi_agent_context.py`: derive per-agent context packets and candidate decisions from an ontology bundle.
- `build_decision_records.py`: map `candidate_decisions` into execution-domain `DecisionRecord` objects.
- `evaluate_risk_policy_gate.py`: run a simple RiskPolicy gate over candidate decisions.
- `build_order_proposals.py`: turn gated decision records into minimal `Order` proposals.
- `simulate_paper_execution.py`: simulate `Order` execution and update `Execution -> Position/PnL` state.
- `runtime_memory.py`: (in `agents/`) session memory persistence for runtime context continuity.
- `run_multi_agent_runtime.py`: minimal multi-agent runtime skeleton that orchestrates agent packets and bridges into execution-domain pre-trade chain. Supports `--agent-context` and direct `--ontology-bundle` input modes.
- `setup_adk_venv.sh`: create `.venv-adk` and install ADK runtime dependencies.
- `run_adk_runtime.sh`: one-command ADK runtime launcher (supports `LLM_API_KEY` bootstrap).
- `fetch_polymarket_public_snapshot.py`: fetch a public Gamma + CLOB snapshot without API keys.
- `capture_polymarket_case_library.py`: capture repeated snapshots and archive high-risk benchmark cases.
- `manage_live_case_labels.py`: export labeling worklists, apply labels, and summarize label coverage.
- `polymarket_stream_capture.py`: capture live market-channel traffic or replay recorded messages into rolling ontology bundles.
- `polymarket_mapper.py`: raw-to-ontology mapping logic for Gamma metadata, CLOB messages, and news signals.
- `polymarket_microstructure.py`: robust-probability and microstructure-risk analysis.
- `polymarket_public_clients.py`: public HTTP clients for Gamma and CLOB.
- `polymarket_ws_client.py`: minimal stdlib websocket client used by live stream capture.
- `smoke_test_polymarket_pipeline.py`: local end-to-end mapper smoke test.
- `smoke_test_polymarket_stream_capture.py`: replay-mode stream capture smoke test.
- `smoke_test_polymarket_case_library.py`: case-library smoke test.
- `smoke_test_live_case_labels.py`: live-case labeling smoke test.
- `smoke_test_multi_agent_context.py`: wrapper for `agents/tests/smoke_test_multi_agent_context.py`.
- `smoke_test_decision_records.py`: wrapper for `agents/tests/smoke_test_decision_records.py`.
- `smoke_test_risk_policy_gate.py`: wrapper for `agents/tests/smoke_test_risk_policy_gate.py`.
- `smoke_test_order_proposals.py`: wrapper for `agents/tests/smoke_test_order_proposals.py`.
- `smoke_test_multi_agent_runtime.py`: wrapper for `agents/tests/smoke_test_multi_agent_runtime.py`.
- `smoke_test_multi_agent_runtime_from_ontology.py`: wrapper for `agents/tests/smoke_test_multi_agent_runtime_from_ontology.py`.
- `smoke_test_multi_agent_runtime_llm.py`: wrapper for `agents/tests/smoke_test_multi_agent_runtime_llm.py`.
- `smoke_test_multi_agent_runtime_adk.py`: wrapper for `agents/tests/smoke_test_multi_agent_runtime_adk.py`.
- `smoke_test_paper_trading_simulation.py`: wrapper for `agents/tests/smoke_test_paper_trading_simulation.py`.
- `smoke_test_runtime_session_memory.py`: wrapper for `agents/tests/smoke_test_runtime_session_memory.py`.
- `benchmarks/evaluate_microstructure_cases.py`: benchmark evaluator for labeled cases.
- `benchmarks/evaluate_execution_safety.py`: execution-safety metrics evaluator for paper-trading payloads.
- `benchmarks/evaluate_recommendation_quality.py`: recommendation-quality metrics evaluator for runtime outputs.
- `benchmarks/generate_benchmark_trend_report.py`: merges benchmark metrics and produces trend report snapshots.
- `benchmarks/smoke_test_execution_safety_benchmark.py`: smoke test for execution-safety benchmark flow.
- `benchmarks/smoke_test_recommendation_quality_benchmark.py`: smoke test for recommendation-quality benchmark flow.
- `benchmarks/smoke_test_benchmark_trend_report.py`: smoke test for benchmark trend reporting flow.

## Core outputs
The pipeline emits ontology bundles with three layers:
1. semantic layer: `Event`, `Market`, `Outcome`, `NewsSignal`, `ResolutionState`
2. microstructure layer: `OrderBookSnapshot`, `TradePrint`, `LiquiditySnapshot`
3. derived layer: `MarketMicrostructureState`

`MarketMicrostructureState` now exposes:
- `displayed_probability`
- `robust_probability`
- `book_reliability_score`
- `trade_reliability_score`
- `manipulation_risk_score`
- `signal_weights`
- `depth_imbalance`
- `quote_trade_divergence`
- `explanatory_tags`

## Usage
Install ADK runtime dependencies:
```bash
bash scripts/ontology/setup_adk_venv.sh
# optional
source .venv-adk/bin/activate
```

Build a bundle from local sample inputs:
```bash
python3 scripts/ontology/build_polymarket_ontology.py \
  --gamma-events ontology/samples/raw/polymarket-gamma-events-sample.json \
  --clob-messages ontology/samples/raw/polymarket-clob-market-channel-sample.json \
  --news-signals ontology/samples/raw/polymarket-news-signals-sample.json \
  --output /tmp/polymarket-bundle.generated.json \
  --pretty
```

Fetch a public live snapshot without API keys:
```bash
python3 scripts/ontology/fetch_polymarket_public_snapshot.py \
  --output-dir /tmp/polymarket-live-raw \
  --limit-events 10
```

Build a bundle from the fetched snapshot:
```bash
python3 scripts/ontology/build_polymarket_ontology.py \
  --gamma-events /tmp/polymarket-live-raw/polymarket-gamma-events.json \
  --clob-messages /tmp/polymarket-live-raw/polymarket-clob-market-channel.json \
  --news-signals /tmp/polymarket-live-raw/polymarket-news-signals.json \
  --output /tmp/polymarket-live-bundle.json \
  --pretty
```

Build multi-agent context packets from a bundle:
```bash
python3 scripts/ontology/build_multi_agent_context.py \
  --bundle ontology/samples/polymarket-sample-bundle.json \
  --output /tmp/polymarket-agent-context.json \
  --pretty
```

Build execution-domain decision records:
```bash
python3 scripts/ontology/build_decision_records.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --output /tmp/polymarket-decision-records.json \
  --pretty \
  --include-hold
```

Run a simple RiskPolicy gate:
```bash
python3 scripts/ontology/evaluate_risk_policy_gate.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --output /tmp/polymarket-risk-gate-report.json \
  --pretty \
  --include-hold
```

Build minimal order proposals:
```bash
python3 scripts/ontology/build_order_proposals.py \
  --decision-records ontology/samples/execution-derived/decision-records-sample.json \
  --risk-gate-report ontology/samples/execution-derived/risk-gate-report-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --output /tmp/polymarket-order-proposals.json \
  --pretty
```

Simulate paper trading from order proposals:
```bash
python3 scripts/ontology/simulate_paper_execution.py \
  --order-proposals ontology/samples/execution-derived/order-proposals-sample.json \
  --decision-records ontology/samples/execution-derived/decision-records-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --output /tmp/polymarket-paper-trading.json \
  --pretty
```

Run the minimal multi-agent runtime skeleton (heuristic engine by default):
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --output /tmp/polymarket-runtime-output.json \
  --pretty \
  --include-hold
```

Run runtime directly from ontology bundle (runtime auto-builds multi-agent context):
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --ontology-bundle ontology/samples/polymarket-sample-bundle.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --runtime-engine llm \
  --llm-mock-responses ontology/samples/multi-agent/llm-mock-responses-sample.json \
  --output /tmp/polymarket-runtime-output.from-ontology.json \
  --pretty \
  --include-hold
```

Run runtime with paper-trading simulation enabled:
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --runtime-engine llm \
  --llm-mock-responses ontology/samples/multi-agent/llm-mock-responses-sample.json \
  --enable-paper-trading \
  --execute-proposed-orders \
  --output /tmp/polymarket-runtime-output.paper.json \
  --pretty \
  --include-hold
```

Run runtime with persistent session memory:
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --ontology-bundle ontology/samples/polymarket-sample-bundle.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --runtime-engine adk \
  --runtime-memory-path /tmp/delphi-runtime-memory.json \
  --session-id session_alpha \
  --output /tmp/polymarket-runtime-output.with-memory.json \
  --pretty \
  --include-hold
```

Run with ADK engine (session/context managed by ADK SessionService):
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --runtime-engine adk \
  --adk-provider openai \
  --adk-openai-model gpt-4o-mini \
  --adk-openai-api-key-env OPENAI_API_KEY \
  --adk-openai-base-url-env OPENAI_API_BASE \
  --adk-model gemini-2.5-flash \
  --adk-app-name delphi_adk_runtime \
  --adk-user-id delphi_runtime_user \
  --adk-session-prefix delphi_adk_session \
  --adk-session-db-url sqlite+aiosqlite:///tmp/delphi_adk_sessions.db \
  --output /tmp/polymarket-runtime-output.adk.json \
  --pretty \
  --include-hold
```

Run ADK engine offline with mock responses:
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --runtime-engine adk \
  --adk-mock-responses ontology/samples/multi-agent/llm-mock-responses-sample.json \
  --output /tmp/polymarket-runtime-output.adk-mock.json \
  --pretty \
  --include-hold
```

Run ADK runtime with one command after exporting a key:
```bash
cp env.adk.example /tmp/env.adk.local
# edit /tmp/env.adk.local then:
# source /tmp/env.adk.local
export LLM_API_KEY="your_api_key"
# Optional for OpenAI-compatible gateway
# export LLM_API_BASE="https://api.openai.com/v1"

bash scripts/ontology/run_adk_runtime.sh
```

If you do not use the default `.venv-adk`, set `PYTHON_BIN` explicitly:
```bash
PYTHON_BIN=/path/to/python bash scripts/ontology/run_adk_runtime.sh
```

Run with LLM engine (OpenAI-compatible API):
```bash
export OPENAI_API_KEY="your_api_key"
python3 scripts/ontology/run_multi_agent_runtime.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --runtime-engine llm \
  --llm-base-url https://api.openai.com/v1 \
  --llm-model gpt-4o-mini \
  --llm-api-key-env OPENAI_API_KEY \
  --output /tmp/polymarket-runtime-output.llm.json \
  --pretty \
  --include-hold
```

Run LLM engine offline with mock responses:
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --runtime-engine llm \
  --llm-mock-responses ontology/samples/multi-agent/llm-mock-responses-sample.json \
  --output /tmp/polymarket-runtime-output.llm-mock.json \
  --pretty \
  --include-hold
```

Capture repeated snapshots and archive high-risk benchmark cases:
```bash
python3 scripts/ontology/capture_polymarket_case_library.py \
  --output-dir /tmp/polymarket-case-library \
  --iterations 6 \
  --interval-seconds 30 \
  --limit-events 10
```

Export an unlabeled worklist:
```bash
python3 scripts/ontology/manage_live_case_labels.py queue \
  --cases-dir /tmp/polymarket-case-library/live-cases \
  --output /tmp/polymarket-case-library/label-worklist.json
```

Apply labels from the suggested robust-probability seed:
```bash
python3 scripts/ontology/manage_live_case_labels.py apply \
  --cases-dir /tmp/polymarket-case-library/live-cases \
  --accept-suggested
```

Apply labels from a curated JSON or CSV file:
```bash
python3 scripts/ontology/manage_live_case_labels.py apply \
  --cases-dir /tmp/polymarket-case-library/live-cases \
  --labels /tmp/polymarket-case-library/labels.json
```

Summarize label coverage:
```bash
python3 scripts/ontology/manage_live_case_labels.py summary \
  --cases-dir /tmp/polymarket-case-library/live-cases
```

Replay recorded market-channel messages into rolling bundles:
```bash
python3 scripts/ontology/polymarket_stream_capture.py \
  --output-dir /tmp/polymarket-stream-replay \
  --replay-messages ontology/samples/raw/polymarket-clob-market-channel-sample.json \
  --gamma-events ontology/samples/raw/polymarket-gamma-events-sample.json \
  --news-signals ontology/samples/raw/polymarket-news-signals-sample.json \
  --flush-every-messages 2 \
  --window-seconds 120
```

Capture live market-channel traffic into rolling bundles with windowing and segment rotation:
```bash
python3 scripts/ontology/polymarket_stream_capture.py \
  --output-dir /tmp/polymarket-stream-live \
  --duration-seconds 300 \
  --flush-every-seconds 15 \
  --window-seconds 120 \
  --max-artifacts-per-segment 40 \
  --max-messages-per-segment 2000 \
  --limit-events 10
```

Run the microstructure benchmark:
```bash
python3 scripts/ontology/benchmarks/evaluate_microstructure_cases.py \
  --cases ontology/samples/benchmarks/microstructure-benchmark-cases.json
```

Evaluate labeled archived live cases:
```bash
python3 scripts/ontology/benchmarks/evaluate_microstructure_cases.py \
  --cases ontology/samples/benchmarks/live-cases \
  --require-labeled
```

Evaluate execution safety metrics from runtime paper-trading output:
```bash
python3 scripts/ontology/benchmarks/evaluate_execution_safety.py \
  --input /tmp/polymarket-runtime-output.paper.json \
  --output /tmp/polymarket-execution-safety-metrics.json \
  --pretty
```

Evaluate recommendation quality metrics from runtime output:
```bash
python3 scripts/ontology/benchmarks/evaluate_recommendation_quality.py \
  --input /tmp/polymarket-runtime-output.paper.json \
  --output /tmp/polymarket-recommendation-quality-metrics.json \
  --pretty
```

Generate benchmark trend report from recommendation + execution metrics:
```bash
python3 scripts/ontology/benchmarks/generate_benchmark_trend_report.py \
  --recommendation-quality /tmp/polymarket-recommendation-quality-metrics.json \
  --execution-safety /tmp/polymarket-execution-safety-metrics.json \
  --history /tmp/delphi-benchmark-history.json \
  --output /tmp/delphi-benchmark-trend-report.json \
  --pretty
```

## Case library layout
`capture_polymarket_case_library.py` writes:
- `snapshots/<timestamp>/`: raw snapshot plus full ontology bundle
- `live-cases/<case_id>/raw/`: raw inputs for the archived case
- `live-cases/<case_id>/ontology/case-bundle.json`: sliced ontology bundle
- `live-cases/<case_id>/benchmark-case.json`: benchmark draft with `reference_probability: null`
- `case-library-index.json`: machine-readable archive manifest

Each `benchmark-case.json` now includes:
- `suggested_reference_probability`: seeded from the current `robust_probability`
- `label_metadata`: reserved for `label_source`, `label_confidence`, `label_notes`, and timestamp

## Stream capture layout
`polymarket_stream_capture.py` writes:
- `segments/segment-XXX/captured-messages.jsonl`: persisted raw market-channel messages
- `segments/segment-XXX/rolling/rolling-bundle-*.json`: rolling ontology bundle artifacts
- `segment-manifest.json`: segment index
- `stream-summary.json`: high-level summary including active window size and segment count

Use `--window-seconds` to build rolling bundles from a recent message window instead of the full capture history.
Use segment rotation to keep long-running captures bounded and easier to archive.

## Notes
1. The mapper intentionally filters to `crypto` and `finance`.
2. The analyzer outputs heuristic risk scores, not proof of manipulation.
3. `robust_probability` is a weighted blend of displayed price, executable book anchor, trade anchor, and fallback probability.
4. The websocket client is implemented with the Python standard library so live streaming does not require extra dependencies.
5. Archived live cases are only benchmark-ready after `reference_probability` is labeled and reviewed.
6. `build_multi_agent_context.py` is the current bridge from market ontology into future Research/Strategy/Risk/Audit agent contracts.
7. `build_decision_records.py` and `evaluate_risk_policy_gate.py` remain intentionally simple pre-orchestration utilities and keep stable contracts used by the runtime skeleton.
8. `build_order_proposals.py` only emits orders for actionable decisions. `hold` decisions are preserved under `skipped_decisions`, not turned into fake buy/sell orders.
9. `simulate_paper_execution.py` adds a paper-trading loop and emits execution records, audit linkage, and updated position/PnL state.
10. `run_multi_agent_runtime.py` is a v0 runtime skeleton. In `adk` mode, it uses ADK Runner + SessionService for per-agent context continuity while preserving the same downstream contract.
11. In `llm` mode, runtime expects an OpenAI-compatible `/chat/completions` endpoint and can be validated offline with `--llm-mock-responses`.
12. `env.adk.example` provides a minimal environment template for ADK runtime startup.

## Architecture docs
For a higher-level overview, read:
1. `docs/zh/08-Polymarket-Ontology-多Agent消费契约-v0.1.md`
2. `docs/en/08-Polymarket-Ontology-Multi-Agent-Consumption-Contract-v0.1.md`
3. `docs/zh/09-Polymarket到多Agent到执行前链路总览-v0.1.md`
4. `docs/en/09-Polymarket-to-Multi-Agent-to-Pre-Trade-Flow-Overview-v0.1.md`

# Polymarket Ontology Pipeline

This directory contains the executable Polymarket ontology pipeline for Delphi.

## Files
- `build_polymarket_ontology.py`: build a bundle from local raw JSON inputs.
- `build_multi_agent_context.py`: derive per-agent context packets and candidate decisions from an ontology bundle.
- `build_decision_records.py`: map `candidate_decisions` into execution-domain `DecisionRecord` objects.
- `evaluate_risk_policy_gate.py`: run a simple RiskPolicy gate over candidate decisions.
- `build_order_proposals.py`: turn gated decision records into minimal `Order` proposals.
- `run_multi_agent_runtime.py`: minimal multi-agent runtime skeleton that orchestrates agent packets and bridges into execution-domain pre-trade chain.
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
- `smoke_test_multi_agent_context.py`: multi-agent context smoke test.
- `smoke_test_decision_records.py`: decision-record mapper smoke test.
- `smoke_test_risk_policy_gate.py`: risk-policy gate smoke test.
- `smoke_test_order_proposals.py`: order-proposal mapper smoke test.
- `smoke_test_multi_agent_runtime.py`: end-to-end multi-agent runtime smoke test.
- `benchmarks/evaluate_microstructure_cases.py`: benchmark evaluator for labeled cases.

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

Run the minimal multi-agent runtime skeleton (heuristic engine by default):
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --output /tmp/polymarket-runtime-output.json \
  --pretty \
  --include-hold
```

Run with the optional ADK adapter engine:
```bash
python3 scripts/ontology/run_multi_agent_runtime.py \
  --agent-context ontology/samples/multi-agent/polymarket-agent-context-sample.json \
  --execution-bundle ontology/samples/fund-execution-sample-bundle.json \
  --runtime-engine adk \
  --output /tmp/polymarket-runtime-output.adk.json \
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
7. `build_decision_records.py` and `evaluate_risk_policy_gate.py` are intentionally simple pre-orchestration utilities; they define output contracts before a full multi-agent runtime exists.
8. `build_order_proposals.py` only emits orders for actionable decisions. `hold` decisions are preserved under `skipped_decisions`, not turned into fake buy/sell orders.
9. `run_multi_agent_runtime.py` is a v0 runtime skeleton. In `adk` mode, it validates ADK availability and keeps the same stable output contract to avoid changing downstream execution semantics.

## Architecture docs
For a higher-level overview, read:
1. `docs/zh/08-Polymarket-Ontology-多Agent消费契约-v0.1.md`
2. `docs/en/08-Polymarket-Ontology-Multi-Agent-Consumption-Contract-v0.1.md`
3. `docs/zh/09-Polymarket到多Agent到执行前链路总览-v0.1.md`
4. `docs/en/09-Polymarket-to-Multi-Agent-to-Pre-Trade-Flow-Overview-v0.1.md`

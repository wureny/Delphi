# Live Case Library

This directory is reserved for archived high-risk Polymarket benchmark cases captured from live snapshots.

Each case directory is expected to contain:
- `raw/polymarket-gamma-events.json`
- `raw/polymarket-clob-market-channel.json`
- `raw/polymarket-news-signals.json`
- `ontology/case-bundle.json`
- `benchmark-case.json`
- `README.md`

`benchmark-case.json` starts as a draft. It now includes:
- `reference_probability: null`
- `suggested_reference_probability`
- `label_metadata`

Recommended workflow:
1. Capture cases with `capture_polymarket_case_library.py`
2. Export a labeling queue with `manage_live_case_labels.py queue`
3. Review and edit the queue or apply the suggested seed
4. Apply labels with `manage_live_case_labels.py apply`
5. Verify coverage with `manage_live_case_labels.py summary`
6. Run `benchmarks/evaluate_microstructure_cases.py --cases ontology/samples/benchmarks/live-cases --require-labeled`

The suggested probability is only a seed from the current robust market signal. It is not ground truth.

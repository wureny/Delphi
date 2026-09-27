# Earnings-to-Thesis eval

This eval measures whether the live engine moves the right thesis objects in the right direction after a real earnings release, without inventing anything.

## Cases

The set has six companies across six sectors: MSFT (cloud), NVDA (semis), GOOGL (internet), AMZN (retail + cloud), JPM (bank) and COST (retail).

Each case in `cases/<ticker>/` has two files:

- `thesis.json`: a demo-authored thesis, **point-in-time**. It is anchored only to the company's *prior* quarter release and guidance, so the event release is genuinely new information to it. It is labeled `demo_derived` and is not a real institution's view.
- `labels.json`: the pinned SEC accession for the event, plus what a competent analyst should do:
  - `must`: must-catch moves.
  - `should`: should-catch moves.
  - `contradictions`: wrong-direction moves. These are the worst failure.

Labels are drafted by engineering and marked `draft_by_engineer_needs_analyst_review`. Label corrections are recorded in the label's `note` with a date.

## Metrics

| Metric | Meaning |
|---|---|
| Must / should recall | Share of labeled moves the engine proposed. Direction is read from the validated patch, not from the proposal's prose. |
| Contradictions | Proposals that move a labeled object the wrong way. |
| Forecast overwrites | Proposals that replace a forecast's original `value` with the reported result. This destroys the "expected vs actual" record. Outcomes belong in `actualValue`. |
| Blocked | Proposals the validators rejected (bad quote, ungrounded number, disallowed patch, and similar). |
| Unlabeled | Reviewable proposals that match no label. They are not necessarily wrong; a human should read them. |

## Run

```bash
npm run eval                                   # all cases, provider/model from .env.local
npm run eval -- --only nvda,cost --effort medium --label "my change"
```

Each run writes:

- a markdown report to `reports/`, which is committed so history is visible;
- per-case run results to `reports/runs-*/`, which is gitignored.

SEC exhibits are cached in `cache/`, so reruns measure the model, not EDGAR.

## Results so far (openai/gpt-5.5)

| Report | Must | Should | Contra. | Overwrites | Blocked | Median latency |
|---|---|---|---|---|---|---|
| prompt v2, effort high | 87% | 80% | 0 | 16 | 0/33 | 108s |
| prompt v3 (`actualValue`), effort high | **100%** | 75% | 0 | **0** | 0/33 | 102s |
| prompt v3, effort medium | 93% | 75% | 0 | 0 | 0/34 | **43s** |

Between the v2 and v3 runs, one JPM label was corrected (see its note).

## Caveats

- There are six cases and one run per configuration, so differences of one hit are within noise.
- Only the earnings release is analyzed; the call transcript is not ingested yet.
- Labels still need an analyst's review before any number here goes in external material.

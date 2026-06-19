# Design

## Architecture

Use a Vite React + TypeScript single-page application with local fixture state.
The first slice keeps all data client-side so the product behaviour can be tested end-to-end before backend and model boundaries are introduced.

## Domain Model

The canonical production model uses Delphi vocabulary only:

* `Asset`
* `Thesis`
* `Assumption`
* `Evidence`
* `Classification`
* `ChangeSummary`
* `DecisionTraceEntry`

Every AI-touched evidence or summary record must expose exactly one grounding affordance:

* citation, when source-backed
* uncertainty flag, when evidence is insufficient

## AI Behaviour Layer

`src/domain/aiBehaviors.ts` provides deterministic placeholders that model the observable contract without calling a model.
These functions are intentionally boring and eval-friendly:

* classify evidence into supports / contradicts / neutral / unclear
* refuse advice or price-target bait
* summarize changes with cited evidence or no-evidence markers
* assemble decision trace entries from structured inputs and human rationale

The placeholder layer must never produce buy/sell recommendations, model chain-of-thought, or model-authored decision rationale.

## UI Design

Production components preserve the prototype's information architecture:

1. Dashboard
2. Evidence Inbox
3. Asset / Thesis Page
4. What Changed

The home view exposes thesis state and change signals; it is not a chat box.
Counter-evidence has dedicated visual paths: dashboard strip, inbox filter, and equal-weight evidence-map column.

## Testing And Evals

Unit tests cover deterministic selectors, state transitions, and domain guards.
UI tests cover the four screens and required states.
Eval cases live under `evals/` and use observable input/output expectations for grounding, uncertainty, advice refusal, counter-evidence handling, stale data, and decision trace integrity.

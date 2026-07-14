## Why

The current prototype demonstrates Delphi's review and authorization model, but it can still record an approved version transition without a meaningful domain-state change, and its future provider and graph boundaries are not yet explicit product contracts. This change makes the governed thesis workflow truthful, deterministic, and technically credible while keeping external services optional.

## What Changes

- Reject empty or semantic no-op patches before they can be approved or applied to canonical thesis state.
- Make the fixture-backed review journey produce a visible, meaningful, and exactly auditable thesis transition.
- Preserve deterministic successful and degraded run replay, reset, provenance, authorization, and fail-closed behavior as first-class product behavior.
- Define configuration and runtime boundaries for analysis providers and graph projections while retaining fixture mode as the default runnable path.
- Keep unavailable live capabilities honest: the product must not imply that a model provider, graph store, or data connector is active when it is not configured.
- Harden the public product surface so capability claims, synthetic-data disclosure, primary actions, and the interactive workflow remain mutually consistent.
- Add contract and end-to-end acceptance coverage for the hardened workflow.
- Explicitly defer live model inference, graph-database deployment, production persistence, authentication, multi-tenancy, licensed data connectors, and real investment-workflow integration.

## Capabilities

### New Capabilities

- `governed-state-transition`: Review, authorize, apply, audit, and reverse thesis changes only when they produce a valid semantic state transition.
- `deterministic-analysis-runtime`: Replay successful and degraded fixture runs predictably, disclose their mode, and reset the complete product state.
- `backend-boundary-configuration`: Select and report analysis-provider and graph-projection capabilities through typed, fail-closed configuration without requiring live infrastructure.
- `public-product-surface`: Present an accurate, reachable, and internally consistent public entry point into the interactive product workflow.

### Modified Capabilities

None. This repository does not yet contain canonical OpenSpec capability specs.

## Impact

- **Domain and runtime:** semantic patch validation, state-transition gateway, analysis adapter composition, configuration parsing, receipts, and safe error envelopes.
- **Fixtures and state:** the canonical successful transition, degraded run, reset behavior, and expected ledger snapshots.
- **Product UI:** Change Inbox, Delta Review, Run Observatory, Decision Ledger, Trust surfaces, and public website actions or disclosures.
- **Verification:** unit, fixture-contract, and Playwright end-to-end tests, plus typecheck and lint gates.
- **Dependencies and infrastructure:** no live provider, graph database, production database, or external data dependency is introduced by this change.

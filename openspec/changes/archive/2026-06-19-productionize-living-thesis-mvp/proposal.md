# Productionize Living Thesis MVP

## Why

Delphi currently has product documents and a Claude-generated prototype, but no production application, OpenSpec contract, test harness, or eval suite.
The living-thesis MVP is the smallest useful vertical slice: users can see thesis state, triage new evidence, inspect what changed, and record human decisions.

The prototype also treats an alternate asset class as a distinct target/user/example category.
The first production slice should instead default to US public-equity-style research and remove separate asset-class positioning while preserving the product's evidence, counter-evidence, uncertainty, and advice-refusal guardrails.

## Scope

This change adds a fixture-backed Vite React + TypeScript production slice for:

* Thesis Dashboard
* Evidence Inbox
* Asset / Thesis Page
* What Changed
* Human-authored decision recording
* Deterministic AI-behaviour placeholders for classification, change summaries, refusal, and trace assembly
* Unit tests, UI tests, and behaviour-first eval cases

Out of scope:

* Real ingestion
* Real model calls
* Auth, database, multi-user attribution, or server-side append-only storage
* Trading, portfolio execution, price prediction, or market-data terminal features

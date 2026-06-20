# Design: Provider Evidence Ingestion

## Architecture

The slice adds `ProviderEvidenceService`, a deterministic application service that sits between `FinancialDataProvider` and `WorkspaceRepository`.

```text
Mock/OpenBB-compatible provider
  -> ProviderEvidenceService
  -> researchContext proposal mapper
  -> WorkspaceRepository.appendEvidenceCandidates
  -> existing Evidence Inbox
```

The UI stays product-shaped. It sees only Delphi evidence objects and does not know whether an item came from mock fixtures, OpenBB, or another provider.

## Candidate Rules

Provider data may create an evidence candidate only when:

* the provider returned structured data,
* the metric crosses a tracked assumption threshold,
* the candidate has exactly one of citation or uncertainty,
* the generated title, summary, and rationale contain no advice or price-target language.

Price snapshots remain market context unless they cross an explicitly modelled assumption threshold. In this slice, price snapshots are not converted into evidence.

Stale provider facts may still create candidates, but they are `uncertain`, `stale`, low-confidence, and not cited as fresh evidence. Users must accept or correct them before they are attached.

Unavailable provider facts create no candidate and no fabricated claim.

## Repository Contract

`WorkspaceRepository` gains an append method for evidence candidates. The fixture adapter deduplicates by evidence id so repeated ingestion is idempotent.

The repository continues to expose only product vocabulary: evidence, source, citation, thesis, assumption, and decision trace.

## UI Contract

The Evidence Inbox receives an explicit "Refresh provider data" action. It runs ingestion for tracked assets and shows newly appended candidates in the existing inbox list.

The action must not:

* auto-accept evidence,
* update conviction,
* alter assumption status,
* generate a decision trace,
* expose provider implementation names as UI architecture.

## Evaluation Strategy

Evals cover:

* grounded counter-evidence creation from a threshold breach,
* stale provider candidate uncertainty,
* unavailable provider data producing no fabricated evidence,
* price snapshot context not becoming evidence,
* advice/price-target guard refusal,
* idempotent re-ingestion,
* no automatic thesis conviction or decision trace changes.

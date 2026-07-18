# Delphi prototype architecture v0.3

This document describes the implemented browser demo, not a deployed enterprise architecture.

## Runtime boundary

```text
Frozen public snapshots + demo-authored thesis + optional browser-local context
                              |
                              v
                    validated context bindings
                              |
                              v
               deterministic recorded-run replay
                              |
                              v
          cited proposals -> human review -> transition gateway
                              |
                              v
             versioned thesis + Decision Ledger record
```

- The default success scenario is MSFT FY2025 Q4. Official source bytes are reviewed during development, normalized
  into small fixture bundles, and never fetched by the runtime.
- The pre-event thesis and forecast are `demo_derived`; they are not attributed to CalPERS or any other real
  institution.
- ARCT-DEMO remains a wholly synthetic controlled-degradation scenario.
- The Context Library attaches catalog or browser-local artifacts to a case. Bindings have an explicit role and
  pre-event/event/post-event scope and produce a deterministic context-set hash.
- A frozen run records which context artifacts were eligible, used, excluded, or unavailable. Attaching context later
  cannot rewrite that record.
- Local file parsing occurs in the browser. PDF support is dynamically loaded; raw file bytes do not enter Zustand,
  the runtime adapter, a network transport, or the ledger.
- Only `applyApprovedChanges` can change canonical thesis state. Context catalog actions cannot mutate a thesis,
  review, or transition.

## Implemented versus future

| Concern | v0.3 demo | Production direction |
|---|---|---|
| Public data | Bundled official-source snapshots | Permission-aware event/filing ingestion |
| Institution context | Public CalPERS policy and 13F references plus demo-authored state | Customer-owned documents, models, portfolio state |
| Local import | Browser-local bounded preview and hash | Governed customer data-plane ingestion |
| Analysis | Deterministic fixture adapter | Policy-routed approved model endpoints |
| Canonical state | Versioned browser-local store | Durable transactional ledger |
| Graph | Read-only in-memory projection | Durable projection only if justified |
| Identity | Analyst/PM role simulation | SSO, SCIM, RBAC/ABAC |

The prototype does not implement live customer connectors, RAG, a model gateway, authentication, server persistence,
trading, customer-data-plane separation, or security certification.

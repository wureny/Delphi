# Fund Context Ingestion Boundary v0.2

**Audience:** product, engineering, technical evaluators, customer security teams  
**Status:** implemented synthetic demo contract; not live customer connectivity

## 1. Why the demo includes this boundary

Delphi cannot compare an event with “what the fund believed” unless it can work with both external evidence and
fund-owned context. The prototype therefore demonstrates the contract and governance path before analysis, while
deliberately avoiding a fake upload flow or fake connected account.

The implemented demo answers five questions:

1. Which source supplied the object?
2. Who owns it and who may use it?
3. What point-in-time version did the run observe?
4. May the content reach an external model or network?
5. Which Delphi objects were derived from it?

## 2. Implemented demo contract

`FundContextManifest` contains four `fixture_simulated`, `read_only` connector records and five artifacts:

| Context role | Demo artifact | Policy meaning |
|---|---|---|
| External evidence | shareholder letter, earnings transcript | synthetic public event evidence; no live retrieval |
| Internal working context | team forecast v12, internal research memo v7 | customer-owned; external-model access blocked |
| Internal approved state | approved thesis v12 | event-time canonical snapshot; external-model access blocked |

Every artifact records:

- stable object and connector IDs;
- classification, data owner, source policy, allowed roles, and policy inheritance;
- `asOf`, `observedAt`, source version, and content hash;
- external-model policy, allowed execution location, and external-transfer decision;
- lifecycle stage, deletion propagation status, graph authority, and derived object references.

The loader parses the manifest through a runtime schema and fails before render when a connector, object, metadata
field, internal model policy, or derived reference is invalid. Validation does not modify source bundles or canonical
thesis state.

## 3. Current execution path

```text
Fixture connector record
→ typed artifact normalization
→ owner and classification
→ source ACL and model-policy check
→ point-in-time parity check
→ stable Delphi object links
→ read-only graph projection
```

`/debug/context` exposes the manifest, filters by context role, and inspects one artifact at a time. `/debug/graph`
projects connector nodes plus `PROVIDES_CONTEXT` and `CONTEXTUALIZES` relationships. The graph remains derived and has
no canonical write authority.

Event-time metadata is stored under explicit `context*` graph attributes. If the live demo advances the approved
thesis from v12 to v13, the historical v12 context remains visible without overwriting the current thesis version.

## 4. Explicit non-capabilities

The current demo does **not** implement or claim:

- live Google Drive, SharePoint, object-storage, email, or research-platform connectors;
- file upload, OCR, parsing queues, or durable ingestion jobs;
- real user authentication, source ACL synchronization, or tenant enforcement;
- embeddings, vector search, RAG, graph persistence, or a graph database;
- live LLM/model-provider routing;
- production retention, deletion propagation, legal hold, or customer export;
- any real fund, customer, licensed, restricted, or MNPI-like data.

No connector performs network access. No fixture artifact permits external transfer. No raw customer content exists in
the repository.

## 5. Production migration order

The contract is designed to let production work replace one boundary at a time:

1. add authenticated tenant/case identity and a policy decision service;
2. implement one permission-aware, read-only customer repository connector;
3. persist normalized source metadata and immutable point-in-time versions;
4. add source ACL propagation, entitlement rechecks, retention, and deletion jobs;
5. add customer-approved model routing and explicit egress receipts;
6. add retrieval/indexing only after permission and deletion behavior are measurable;
7. retain the governed proposal/review/transition gateway as the only canonical write path.

The first pilot should choose one repository and one document class. Connector breadth is not a prerequisite for
validating Earnings-to-Thesis.

## 6. Demo acceptance

The boundary is acceptable when:

- all five artifacts and four connector records validate deterministically;
- internal model and memo artifacts block external-model access;
- every artifact forbids external transfer;
- filtering and inspection work on desktop and narrow screens;
- graph connector/context edges resolve through stable Delphi IDs;
- v12 event-time context cannot overwrite a later canonical thesis version;
- the UI prominently states that no live customer system is connected.

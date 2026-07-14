## Context

Delphi's current runnable workflow already contains the product objects needed to demonstrate a future fund-data boundary: source documents and excerpts, a customer-shaped team forecast, approved thesis state, proposals, reviews, transitions, and a deterministic graph projection. What is missing is an explicit normalized envelope that answers five questions for every input:

1. What system or repository supplied it?
2. Who owns it and who may use it?
3. What was known at the relevant point in time?
4. What model route, if any, may receive it?
5. Which Delphi objects and graph relationships were derived from it?

The feature must remain useful as a product demonstration without implying that a live document connector, customer deployment, or access-control system is already running.

## Goals / Non-Goals

**Goals:**

- Make the future fund-context path visible through stable, schema-validated product contracts.
- Demonstrate public evidence, internal working context, and internal approved state as separate roles.
- Show classification, ownership, authorization, point-in-time, model policy, deletion propagation, and graph derivation together.
- Preserve the canonical thesis and Decision Ledger as the only governed state; context and graph remain read-only inputs or projections.
- Reuse the current product shell, UI primitives, fixture loader, graph port, and test stack.

**Non-Goals:**

- Reading a real Drive, SharePoint, Slack, email, filesystem, market-data, portfolio, order-management, or research-provider account.
- Uploading or parsing arbitrary user files.
- Running OCR, embedding, vector retrieval, entity resolution, or live LLM extraction.
- Claiming real authentication, document-level ACL enforcement, customer data-plane deployment, retention enforcement, or deletion execution.
- Writing back to a source repository, portfolio system, approved thesis, or Decision Ledger.
- Making graph data canonical or introducing a graph database.

## Decisions

### 1. Use a manifest over existing product objects

The demo will add a `FundContextManifest` containing connector descriptors and artifact governance envelopes. Each artifact references an existing stable Delphi object such as a `SourceDocument` or `ThesisSnapshot`. This avoids copying document content into a second model while allowing the UI to explain ownership, access, point-in-time, model policy, and derived references.

One internal research memo is added as a normal `SourceBundle` so the demo contains an actual document-shaped internal input. Its graph links are derived by the manifest; it does not silently alter approved thesis evidence or the expected v12 to v13 transition.

**Alternative considered:** extend every source document with connector-specific fields. Rejected because connector metadata, customer policy, and lifecycle state are deployment concerns that should not contaminate the stable evidence contract.

### 2. Make simulated connectors unmistakable

Every connector uses `mode: fixture_simulated`, `accessMode: read_only`, `executionLocation: local_demo`, and a fixture status. The UI repeats that these are synthetic contract demonstrations, not active customer integrations. No vendor logo or connected-account language is used.

**Alternative considered:** render familiar provider logos and green connected states. Rejected because that would imply unavailable integrations.

### 3. Treat point-in-time and access policy as first-class fields

Each artifact records `asOf`, `observedAt`, `version`, `contentHash`, classification, data owner, access policy, allowed roles, and policy inheritance. Contract validation compares these fields with the referenced source or thesis object. Internal artifacts must block external-model access in this fixture configuration.

This is necessary because a plausible graph built from hindsight or unauthorized documents is not a valid decision reconstruction.

### 4. Keep graph context derived and product shaped

The graph projection will add stable connector nodes and two edge types:

- `PROVIDES_CONTEXT`: a simulated connector supplies the normalized artifact envelope;
- `CONTEXTUALIZES`: an artifact is related to a Delphi thesis, forecast, pillar, evidence item, or proposal.

The projection will enrich existing source or thesis nodes instead of creating duplicate canonical objects. Every edge endpoint must resolve, and the projection keeps no write authority.

### 5. Add a dedicated internal debug surface

`/debug/context` will show:

- boundary summary and current limitations;
- a six-stage synthetic pipeline from discovery to graph projection;
- searchable and role-filtered artifact inventory;
- connector, ownership, access, point-in-time, model-policy, and lifecycle inspection;
- stable derived object references and a link to the graph debug surface.

The page is separate from the main analyst workflow so it can support technical evaluation without adding ingestion administration to the end-user product.

### 6. Validate behavior, not only display copy

Unit and contract tests will reject unresolved connectors, divergent source metadata, unsafe internal model policy, duplicate IDs, and unresolved graph references. E2E tests will exercise artifact filtering and selection, inspect the internal memo's governance fields, navigate to graph debug, and verify context relationships.

## Risks / Trade-offs

- **[Risk] Reviewers may mistake fixtures for active connectors.** → Repeat simulated/read-only/local language in connector data, status copy, and documentation.
- **[Risk] The manifest becomes a speculative integration platform.** → Keep the contract to fields already required for trust, point-in-time reconstruction, and graph provenance.
- **[Risk] Context edges imply canonical evidence.** → Use `CONTEXTUALIZES`, not `SUPPORTED_BY`, unless the governed thesis explicitly references an excerpt.
- **[Risk] Internal-document examples look like real customer content.** → Keep all names, figures, users, and repositories synthetic and label them visibly.
- **[Trade-off] No arbitrary upload means the demo does not prove parser quality.** → Parser and connector quality remain later validation tracks; this change proves the contract and product boundary.

## Migration Plan

1. Add the manifest contract and failing validation tests.
2. Add the internal memo and fund-context fixtures through the schema-validated loader.
3. Extend the deterministic graph projection and endpoint-integrity tests.
4. Add the internal context surface and shell navigation.
5. Add E2E coverage, browser inspection, responsive verification, and production build validation.

Rollback is file-level. Removing the optional context manifest input returns the graph to its previous projection, and the canonical thesis workflow remains unchanged throughout.

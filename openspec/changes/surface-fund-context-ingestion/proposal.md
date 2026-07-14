## Why

The current prototype proves the governed Earnings-to-Thesis workflow and a product-shaped graph projection, but it does not yet make the future customer-data path concrete. A reviewer can see public event evidence, an approved thesis, and a team forecast, but cannot inspect how external evidence, internal approved state, and internal working context would enter Delphi under point-in-time, access, model-routing, and provenance controls.

This change adds a truthful synthetic demonstration of that boundary. It does not connect a real fund system; it makes the normalized contract, trust boundary, and derived graph path visible and executable with fixture data.

## What Changes

- Define a schema-validated fund-context manifest for synthetic connectors and normalized artifacts.
- Represent external event evidence, an internal financial model, an internal research memo, and approved thesis state as distinct context roles.
- Record source ownership, classification, access policy, allowed roles, point-in-time metadata, content hashes, model-routing policy, lifecycle state, and derived object references.
- Add one synthetic internal research memo fixture without changing the canonical approved thesis or successful review outcome.
- Extend the read-only graph projection with fixture connector nodes and `PROVIDES_CONTEXT` / `CONTEXTUALIZES` relationships.
- Add an internal Fund Context Boundary page with artifact filtering, governance inspection, pipeline visualization, and a path into the graph debug surface.
- Keep all connector language explicit that the current implementation is simulated, local, read-only, and non-persistent.
- Add contract, unit, and end-to-end verification for manifest consistency, point-in-time metadata, permission propagation, graph endpoint integrity, UI interaction, and responsive rendering.

## Capabilities

### New Capabilities

- `fund-context-ingestion-boundary`: Normalize and describe external and customer-owned context through a typed, point-in-time, access-aware fixture contract without requiring a real connector.
- `context-provenance-debug-surface`: Inspect synthetic context sources, governance metadata, derived references, and the read-only graph path through an internal product surface.

### Modified Capabilities

None. The existing graph and runtime changes remain unarchived and do not yet exist as canonical OpenSpec capabilities.

## Impact

- **Domain and fixtures:** new fund-context types, runtime schema, synthetic manifest, and one internal research-memo source bundle.
- **Graph projection:** connector nodes, context edges, and additional product-safe metadata on existing source and thesis nodes.
- **Product UI:** a new `/debug/context` internal route, navigation entry, and cross-link to `/debug/graph`.
- **Verification:** manifest-contract, graph, and Playwright coverage plus the existing release gates.
- **Infrastructure:** no external connector, filesystem reader, document upload, vector database, graph database, live model call, authentication system, or customer data is introduced.

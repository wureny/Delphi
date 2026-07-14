## 1. Define the fund-context contract

- [x] 1.1 Add typed connector, artifact-governance, point-in-time, model-policy, lifecycle, and manifest objects.
- [x] 1.2 Add runtime schemas and fixture-loader validation for the complete manifest.
- [x] 1.3 Add one synthetic internal research memo as a normal source bundle without modifying canonical thesis evidence.

## 2. Enforce manifest consistency

- [x] 2.1 Validate unique stable IDs, connector references, source/thesis metadata parity, and allowed context roles.
- [x] 2.2 Require internal context to block external-model access in the current fixture configuration.
- [x] 2.3 Reject unresolved derived object references and assert that the manifest cannot mutate canonical state.

## 3. Extend the read-only graph projection

- [x] 3.1 Add product-shaped connector nodes plus `PROVIDES_CONTEXT` and `CONTEXTUALIZES` relationships.
- [x] 3.2 Enrich projected source and thesis nodes with safe classification, access, point-in-time, and lifecycle fields.
- [x] 3.3 Preserve deterministic ordering, current/stale validation, endpoint integrity, and canonical-write isolation.

## 4. Implement the internal context surface

- [x] 4.1 Add `/debug/context` with truthful synthetic boundary summary and pipeline stages.
- [x] 4.2 Add searchable and context-role-filtered artifact inventory with selected-state inspection.
- [x] 4.3 Display connector, owner, access, point-in-time, model-policy, lifecycle, and derived graph references.
- [x] 4.4 Add shell navigation and a working path between context and graph debug surfaces.
- [x] 4.5 Verify desktop and narrow layouts follow the existing product design system without overflow or clipped controls.

## 5. Verify and document the completed boundary

- [x] 5.1 Add unit and contract coverage for valid and invalid manifests, metadata parity, safe model policy, and graph links.
- [x] 5.2 Add E2E coverage for context filtering, internal memo inspection, graph navigation, and synthetic disclosures.
- [x] 5.3 Run all unit/contract tests, E2E, typecheck, lint, production build, and strict OpenSpec validation.
- [x] 5.4 Update README, system architecture, trust, acceptance, and QA documentation with current behavior and explicit limitations.

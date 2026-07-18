## Context

Delphi currently has three strong boundaries: typed evidence and thesis objects, deterministic proposal replay, and a governed human-approved transition gateway. It also has a schema-validated synthetic `FundContextManifest`, but the manifest is hard-coded and visible only under `/debug/context`. The default ARCT scenario therefore proves software behavior but not that the product can carry real investment material with truthful provenance.

The new demo must improve credibility without creating two new false claims: that public documents are a real fund's private research, or that a deterministic fixture run is live AI analysis. The design therefore treats data realism, document authorship, and execution mode as independent dimensions.

## Goals / Non-Goals

**Goals:**

- Demonstrate the complete governed workflow against a real public company and a real, fixed earnings event.
- Preserve point-in-time discipline: the pre-event thesis may use only material available before the earnings release.
- Make every object visibly identifiable as real public, demo-derived, synthetic, or locally user-provided.
- Let an evaluator add and remove context, inspect normalization and policy decisions, and see the selected context set flow into the case and run.
- Keep the demo deterministic, reproducible, browser-safe, and deployable through ChatGPT Sites.
- Preserve the current canonical write, authorization, degradation, rollback, and reset semantics.

**Non-Goals:**

- Claiming access to any real institution's private thesis, model, research repository, permissions, or workflow.
- Live scraping from the published app, arbitrary URL ingestion, OCR, email/Drive/SharePoint connectors, or entitlement-controlled market data.
- Running an LLM over arbitrary uploaded files or making uploaded material affect deterministic Thesis Delta Proposals.
- Reproducing complete earnings transcripts, reports, or licensed datasets in the repository.
- Adding authentication, durable backend storage, production RBAC, a graph database, trading, or investment advice.

## Decisions

### 1. Use Microsoft FY2025 Q4 as the fixed real-company scenario

The default success path will use Microsoft because its official Investor Relations site provides a stable first-party earnings release, financial statements, outlook, slides, 10-K, and a complete conference-call transcript. SEC materials provide a regulator-hosted verification path. The scenario is frozen to FY2025 Q4 rather than continuously following the latest quarter so screenshots, citations, numeric validation, and expected transitions remain reproducible.

The source set is split by event time:

| Set | Material | Permitted use |
|---|---|---|
| Pre-event | FY2025 Q3 release/transcript/10-Q and previously published annual material | Build the demo-authored thesis and forecast immediately before Q4 results |
| Event | FY2025 Q4 release, financial statements, outlook, slides, and conference-call transcript | Evidence for actual results, guidance, prepared remarks, and Q&A |
| Post-event corroboration | FY2025 10-K/annual report | Filing confirmation only; never allowed to leak into the pre-event thesis |
| Public institutional reference | CalPERS Total Fund Investment Policy and the SEC-filed Form 13F snapshot that discloses an MSFT holding | Demonstrate real institutional policy/position context; never infer a private thesis or recommendation |

The repository stores canonical URIs, publication/observation/retrieval timestamps, content hashes, structured numeric facts, locators, and short excerpts. It does not store an entire transcript or report unless redistribution is explicitly permitted.

### 2. Separate origin, authorship, and execution mode

`VersionEnvelope.synthetic` remains for backward compatibility, but product contracts gain explicit fields:

- `originKind`: `real_public | demo_derived | synthetic | user_provided_local`;
- `publisherKind`: `issuer | regulator | institution | demo_team | user`;
- `authorshipLabel`, `canonicalUri`, `retrievedAt`, and `rightsNote` on source/provenance records;
- `derivedFromSourceRefs` on demo-authored thesis and forecast objects;
- `inputUsage`: `eligible | used | excluded | unavailable` with a product-safe reason on a run context record.

`real_public` means the content and metadata came from the named official public source. `demo_derived` means Delphi's demo authors constructed the view from cited public material. It never means a real institution approved that thesis. `synthetic` remains reserved for ARCT and failure fixtures. `user_provided_local` never leaves the browser.

The deterministic adapter continues to report `mode: fixture`; a real input does not turn a fixture replay into live AI.

### 3. Snapshot sources at development time, never at public-demo runtime

A checked-in allowlist manifest will define source ID, canonical URI, publisher, publication date, event-time role, expected media type, permitted extraction, and rights note. A developer-only command will fetch official sources, normalize facts/excerpts, compute hashes, and produce a reviewable diff. CI validates the checked-in snapshots but does not depend on network availability.

Refresh is explicit. Source drift produces a report and fails the refresh command until a maintainer reviews changed facts, excerpts, hashes, and expected proposals. The Sites application reads only checked-in normalized artifacts and never silently changes after deployment.

### 4. Promote the context boundary into a product-facing Context Library

`/context` replaces the debug page as the main entry point while `/debug/context` remains a compatibility redirect or advanced provenance view. The main navigation label becomes `Context Library`.

The page has three stable regions:

1. **Case context set** — the artifacts currently attached to MSFT, grouped as institution policy, position disclosure, approved thesis, working forecast, company/event evidence, and local additions.
2. **Source catalog** — the bundled real public and demo-derived artifacts, each with origin, publisher, date, authority, and availability badges.
3. **Inspector / add flow** — source preview, exact provenance, role/classification, point-in-time, model/transfer policy, case binding, and confirm/remove action.

`Add context` uses a four-step drawer: choose catalog or local file; preview parsed metadata/content; assign context role, case, classification, and as-of date; confirm. Adding context changes the case-context binding only. It cannot change an approved thesis, create a proposal, or write a ledger transition.

### 5. Support honest local import without pretending to analyze it

The initial browser importer accepts text-based PDF, CSV, JSON, TXT, and Markdown. PDF OCR and XLSX are deferred. Parsing runs in the browser; raw content is not uploaded. The user sees file name, size, detected type, extracted text/table preview, local hash, and any parsing warnings before confirmation.

Local imports receive `originKind: user_provided_local`, `externalModelAccess: blocked`, `externalTransfer: false`, and `inputUsage: excluded` with reason `not_analyzed_in_deterministic_demo`. Metadata and normalized preview may persist in browser-local storage; Reset demo removes them. Unsupported, encrypted, image-only, oversized, or malformed files fail with a clear non-destructive message.

This gives the demo a real context-addition interaction while keeping the later production connector/parser/model-routing track honest.

### 6. Make context usage visible through the existing workflow

The Investment Case shows context coverage, origin mix, point-in-time cutoff, and missing/unused inputs. Run Observatory gains an `Inputs` view that records every eligible, used, excluded, and unavailable artifact. Evidence Drawer shows origin and a working link to the official source. Trust Receipt reports real-public, demo-derived, synthetic, and local counts separately. Decision Ledger records the immutable context-set hash and used evidence references for the transition.

The successful MSFT fixture will produce a small number of deterministic, cited proposals around Azure growth, AI-capacity constraints, cloud-margin/capital-intensity risk, and the next-quarter outlook. The exact proposal set is authored and reviewed against official excerpts and the demo-derived pre-event thesis; it is not represented as fresh model output.

ARCT remains available as the synthetic degraded scenario because intentionally missing evidence and blocked proposals are easier to test with controlled fixtures.

### 7. Resolve the five public-demo defects in the same credibility release

- Move or dynamically offset Toasts so they never cover the sticky Apply bar or bottom navigation; cap simultaneous toasts and keep dismiss controls keyboard-accessible.
- Self-host the Geist assets under a Sites-compatible public path, or deliberately remove them and use the declared system stack; release validation must observe no font 404.
- Add a compact review-progress summary, outstanding-risk count, and collapse completed proposal bodies while preserving evidence access.
- Add a real focus trap/background inert behavior to Modal and Drawer, complete combobox/listbox/option keyboard semantics for search, and retain Escape/focus restoration/reduced-motion behavior.
- Eager-load/preload the public website hero screenshot while retaining lazy loading for below-fold media.

### 8. Preserve compatibility and migrate persisted demo state once

Existing ARCT IDs, routes, gateway types, and expected degraded behavior remain valid. MSFT receives new stable IDs and becomes the default inbox/case route. The versioned Zustand persistence envelope advances once; incompatible stored state is discarded through the existing deterministic reset path. `/debug/context` remains reachable so existing technical links and tests can be migrated without a broken route.

## Risks / Trade-offs

- **[Risk] Real company/fund names imply endorsement or inside knowledge.** → Display source-specific disclaimers, keep the thesis under a Delphi Demo Team identity, and never label public position data as conviction.
- **[Risk] Future information leaks into the pre-event view.** → Enforce publication/observation cutoffs in contract tests and reject any pre-event dependency with a later timestamp.
- **[Risk] Official pages change or disappear.** → Freeze normalized facts/excerpts and hashes; keep canonical links plus a reviewed source-drift workflow.
- **[Risk] Copyright or terms concerns from bundling documents.** → Store only facts, metadata, locators, hashes, and short excerpts; link to complete official documents.
- **[Risk] Local upload suggests arbitrary AI analysis.** → Mark it local and excluded from deterministic analysis in the add flow, run inputs, and Trust Receipt.
- **[Risk] Adding MSFT doubles fixtures and tests.** → Make MSFT the only full success fixture and retain ARCT only for synthetic degradation/regression, not a second complete happy path.
- **[Trade-off] No runtime retrieval means the demo is not live.** → Prefer reproducible evidence and a truthful snapshot over a brittle scraper; live connectors remain a later boundary.

## Migration and Rollout

1. Archive or otherwise preserve the two completed OpenSpec changes, then validate this change against their implemented contracts.
2. Land provenance types and compatibility tests before introducing new data.
3. Add the reviewed source manifest and frozen MSFT/public-institution snapshots; have a human verify every fact, locator, and rights note.
4. Add the MSFT case, thesis, run, proposals, expected transition, and persistence migration behind a scenario flag.
5. Build `/context`, local import, and workflow-wide context usage surfaces; retain `/debug/context` compatibility.
6. Fix the five demo defects and complete accessibility/network inspection.
7. Switch MSFT to the default scenario only after the complete regression and browser gate passes.
8. Publish a new ChatGPT Sites version, smoke-test the deployed URLs/assets, and keep the prior Sites version available for immediate rollback.

Rollback restores ARCT as the default and the prior persistence version. All new context bindings are additive and the governed transition gateway does not require a data migration.

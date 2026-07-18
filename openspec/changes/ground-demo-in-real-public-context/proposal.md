## Why

The current prototype proves a governed Earnings-to-Thesis workflow, but its company, thesis, earnings release, earnings call, forecasts, and institutional context are synthetic. The existing `/debug/context` surface proves a contract, not an analyst experience: evaluators cannot add context, distinguish real public material from demo-authored material, or see how selected context changes the case and run inputs. This weakens the most important demo claim even though the review and transition mechanics are real.

This change grounds the default demo in a fixed Microsoft FY2025 Q4 event pack from official Microsoft and SEC sources, introduces explicit data-origin and authorship labels, and promotes context ingestion into an interactive product surface. It keeps arbitrary inference, private customer connectivity, and production persistence out of scope so the demo remains deterministic, inspectable, and truthful.

## What Changes

- Add a default `MSFT FY2025 Q4` scenario built from frozen, point-in-time official public sources: prior-quarter materials for the pre-event view and the official earnings release, financial statements, outlook, 10-K, slides, and earnings-call transcript for event evidence.
- Keep `ARCT-DEMO` as the visibly synthetic degraded/failure scenario and regression fixture; it is no longer the primary success path.
- Add explicit provenance that distinguishes `real_public`, `demo_derived`, `synthetic`, and `user_provided_local` objects. A demo-authored thesis or forecast must never be presented as a real institution's internal view.
- Add public institutional reference context using a CalPERS investment-policy document and point-in-time SEC Form 13F holding disclosure. These artifacts provide real institutional shape but explicitly do not imply a CalPERS thesis, recommendation, endorsement, or active-management decision.
- Add a product-level `/context` library with a case context set, curated public-source catalog, add/remove flow, metadata preview, role/classification assignment, point-in-time inspection, and local-only file import.
- Support local browser import for text-based PDF, CSV, JSON, TXT, and Markdown. Imported material remains local, non-canonical, and excluded from automated proposal generation in this deterministic demo.
- Make the selected context set visible on the Investment Case, Run Observatory, Evidence Drawer, Trust Receipt, and Decision Ledger so evaluators can tell which inputs were eligible, used, or excluded.
- Add a reproducible developer-time source snapshot pipeline. The public demo performs no runtime scraping and redistributes only normalized facts, source metadata, and short cited excerpts rather than complete third-party documents.
- Resolve the five known credibility issues: toast/apply-bar collision, missing deployed fonts, dense review progress, incomplete modal/search keyboard semantics, and lazy-loaded website hero media.
- Add contract, unit, end-to-end, accessibility, network-asset, source-drift, and strict OpenSpec verification.

## Capabilities

### New Capabilities

- `real-public-demo-scenario`: Run the governed Earnings-to-Thesis journey on a frozen, cited real-company earnings event without implying that demo-authored views are real institutional research.
- `interactive-context-library`: Add, inspect, bind, and remove curated or local context through a product-facing workflow while preserving provenance, point-in-time, privacy, and canonical-write isolation.
- `credible-demo-experience`: Present real/synthetic boundaries clearly and remove interaction, asset, density, and accessibility defects that weaken the public demonstration.

### Modified Capabilities

None. The two completed OpenSpec changes are still unarchived and this repository does not yet contain canonical capability specs. This change builds on their implemented contracts without redefining the governed transition gateway.

## Impact

- **Domain and contracts:** additive provenance/authorship fields, broader context-source modes, case-context bindings, import status, and run input-usage records; existing IDs, patch rules, and transition semantics remain stable.
- **Data and tooling:** a frozen MSFT source inventory, normalized source bundles, demo-derived pre-event thesis and forecast, deterministic proposals, public institutional reference artifacts, and a developer-only snapshot/verification script.
- **Product UI:** MSFT becomes the default success case; `/context` joins the primary product navigation; context coverage and provenance appear throughout the existing case, run, evidence, trust, and ledger journey.
- **Persistence:** curated bindings use the existing versioned demo state; local imports use browser-local storage and are cleared by Reset demo. No server persistence is introduced.
- **Verification and release:** the existing 73 unit/contract and 9 E2E scenarios remain regression gates and are extended for the new real-data journey, context import, accessibility, and deployed-asset checks.
- **Infrastructure:** no live model, arbitrary URL fetcher, authenticated connector, database, vector store, graph database, or customer data plane is added.

# Delphi — Earnings-to-Thesis Prototype (v0.2)

> **Models propose. Validators constrain. Humans approve. The ledger records.**

Delphi is an AI-native **Investment Decision OS** for fundamental investment teams. This repository contains the
interactive prototype of the first workflow — **Earnings-to-Thesis** — plus the public company website, built to the
v0.2 specification in [`Delphi_Prototype_and_EFL_Pack_v0_2/`](Delphi_Prototype_and_EFL_Pack_v0_2/).

**All data is synthetic. Nothing here is investment advice.**

## What the prototype proves

One coherent, governed loop:

```text
Synthetic earnings event
→ compare with approved thesis v12
→ generate cited Thesis Delta Proposals
→ human Accept / Edit / Reject / Escalate / Defer
→ apply only authorized, approved changes
→ create approved thesis v13
→ record the transition in the Decision Ledger
```

Specifically:

- **Approved state is real** — a typed, versioned `ThesisSnapshot` that only the State Transition Gateway can mutate.
- **Model output is a proposal** — validated for schema, evidence, numbers, references, version, patch allowlist,
  authorization, and degraded policy before any canonical write.
- **Authorization is enforced in domain code** — an Analyst cannot approve a high-materiality PM-required delta and is
  prompted to escalate; blocked evidence fails closed for every role.
- **The v12 → v13 transition is a real state mutation** — before/after content hashes, evidence lineage, review
  history, workflow/skill/model versions, exclusion of rejected/escalated/deferred items, and safe rollback.
- **Every approved transition is semantic** — direct and composite no-ops fail closed before approval metadata,
  versioning, snapshots, or ledger records are written; the ledger diff is derived from the same governed projection.
- **Degradation is honest** — a missing transcript retains safe partial findings, blocks transcript-dependent
  proposals, and never fabricates evidence.
- **Reset is deterministic** — one action restores the pristine fixture state (verified by content hash).
- **Backend boundaries are inspectable without pretending they are deployed** — typed composition selects fixture mode
  by default, `/debug/context` shows a policy-checked synthetic fund-context ingestion contract, and `/debug/graph`
  exposes its deterministic read-only product projection with no graph database.

## Requirements

- **Node.js ≥ 22.13** (Next.js 16 + Sites/Vinext Worker build). On this machine use Homebrew Node:
  `export PATH=/opt/homebrew/bin:$PATH`.
- npm (bundled with Node). No API keys, no network access needed after `npm install`.

## Commands

```bash
npm install               # install dependencies
npm run dev               # dev server        → http://localhost:3000 (or -- --port 3050)
npm run build             # Sites/Vinext production Worker build → dist/
npm run build:next        # optional native Next.js compatibility build
npm run start             # run the production Worker locally
npm run typecheck         # TypeScript strict typecheck
npm run lint              # ESLint
npm test                  # Vitest unit + contract tests (73 tests)
npm run test:e2e          # Playwright E2E (9 scenarios; starts its own dev server on :3050)
node scripts/capture-screenshots.mjs   # regenerate website screenshots from the live app
```

## Routes

| Surface | Route |
|---|---|
| **Change Inbox** (home) | `/` |
| Investment Case | `/cases/arct-demo` |
| Delta Review | `/deltas/proposal_arct_enterprise_001` (any proposal ID) |
| Run Observatory | `/runs/run-arct-success` · `/runs/run-arct-degraded` |
| Decision Ledger | `/ledger` · `/ledger/:transitionId` |
| Trust / Privacy Receipt | `/trust` · `/trust/run-arct-success` |
| Internal fund-context ingestion debug | `/debug/context` |
| Internal graph projection debug | `/debug/graph` |
| **Public website** | `/website` (`#product` `#how-it-works` `#security` `#company` `#contact`) |

> The build brief assigns `/` to both the product and the website; per the v0.2 rule "the default home route must be
> Change Inbox", the product owns `/` and the website lives at `/website`.

## Architecture

```text
app/                      Next.js App Router
├── (product)/            product surfaces (inbox, cases, deltas, runs, ledger, trust)
└── website/              public company website
src/
├── domain/               types · zod schemas · semantic patch engine · transition
│                         gateway · policies · validators · content hashing
├── fixtures/             canonical v0.2 JSON fixtures + schema-validated loader
├── context/              typed fund-context manifest validation + policy checks
├── runtime/              typed runtime composition + AnalysisAdapter boundary +
│                         deterministic replay + read-only graph projection + receipt
├── store/                Zustand demo store (localStorage persistence, reset)
└── components/           shell, UI primitives, evidence drawer, delta cards, trust
tests/
├── unit/ contracts/      Vitest — gateway rules, patch allowlist, adapters, fixtures
└── e2e/                  Playwright — review, degradation, reset, persistence,
                          context/graph debug, public navigation, responsive website
.openai/hosting.json      Sites project metadata (no runtime secrets)
build/ + worker/          Sites packaging plugin + Cloudflare Worker entry point
vite.config.ts            Vinext/Sites production build composition
```

Key boundaries (mirroring the production direction in `04_SYSTEM_ARCHITECTURE.md`):

- **Stable institutional state vs. run state vs. governed transitions** are separate typed objects; they never share a
  mutable record.
- All mutations flow through pure gateway functions (`src/domain/transitions.ts`); the UI renders policy decisions and
  never re-implements rules.
- The runtime is consumed only through `AnalysisAdapter`:

  ```ts
  export interface AnalysisAdapter {
    run(input: AnalysisInput): AsyncIterable<RunEvent>;
  }
  ```

  `FixtureAnalysisAdapter` (required, deterministic, zero-delay in tests) is the canonical public-demo path.
  `LiveModelAnalysisAdapter` exists behind the same interface but is intentionally unimplemented. A single server-side
  composition boundary validates optional configuration, falls back safely to fixtures, and exposes only a
  product-shaped capability descriptor — the demo never depends on a model provider.
- Canonical equality, hashing, and ledger diffs use one semantic thesis projection. Recording metadata cannot create a
  new version, and a batch whose patches cancel out is rejected atomically.
- The graph port derives nodes and typed relationships from canonical product objects using stable Delphi IDs. The
  first implementation is an in-memory projection for internal inspection only; it has no write authority, persistence,
  Cypher, Neo4j, or vendor payloads.
- The fund-context boundary normalizes five synthetic artifacts from four fixture-simulated read-only connectors. It
  records ownership, classification, source ACL, point-in-time metadata, model policy, lifecycle, and derived object
  links; internal model and memo fixtures block external-model access and every artifact forbids external transfer.

## Fixture mode (default and only demo mode)

Fixtures in `src/fixtures/data/` are the v0.2 canonical set (copied verbatim from the spec pack) and are
schema-validated with Zod at load. Every file carries `{ fixtureVersion: "0.2.0", schemaVersion: "2026-07-13",
synthetic: true }`. The demo works fully offline after install; no environment variables are required
(see [`.env.example`](.env.example)).

## Demo script (90-second path)

1. **Problem** — inbox shows material changes, not a chat box.
2. **Change Inbox** → open ARCT-DEMO FY2026 Q2.
3. Open the high-materiality **Thesis Delta**; open the exact **evidence** excerpt.
4. **Human review** — Accept the medium-materiality item (or Edit; note the Analyst is blocked from the PM-required
   item and prompted to escalate).
5. **Apply approved changes** → open the **Decision Ledger** entry: v12 → v13, before/after diff, evidence, actor,
   workflow/model versions.
6. Close: governed investment state persists across models.

The four-minute path adds: Investment Case (approved v12), deterministic replay in the Run Observatory, all four
proposals, the Analyst/PM role switcher, the degraded run (missing transcript → blocked proposal → escalate), the
Privacy Receipt, and the design-partner CTA on `/website`. Before any demo: click **Reset demo**.

## Security disclaimer

This is a **pre-launch prototype using synthetic data only**. It runs entirely in the local browser session; no raw
content is sent to any cloud, no external web access occurs at runtime, and no secrets exist in the repository or
client bundle. The customer-owned data-plane separation described on the website and Trust page is a **target
architecture / roadmap direction** — not a deployed or certified capability. No SOC 2, penetration-testing, retention,
or MNPI-compliance claims are made.

## Known limitations

- Demo state lives in `localStorage` (single browser profile); there is no server persistence or authentication —
  intentional for the prototype stage (`07_SECURITY_PRIVACY_TRUST.md` §12).
- The role switcher simulates Analyst/PM identity; it is a demo affordance, not access control.
- Only the ARCT-DEMO case is interactive; the other inbox/case rows are explicitly disabled scope markers.
- Rollback is limited to the most recent transition (safe demo flow).
- Prior-quarter evidence referenced by the approved thesis resolves as *unavailable by design* (the fixture set ships
  only event-window sources) — demonstrating the fail-closed evidence path.
- The live-model adapter is a typed stub; wiring a provider requires implementing it server-side (never required for
  the demo).
- The graph debug page is a deterministic in-memory projection, not a graph database or durable graph service.
- The context debug page demonstrates contracts and policy behavior only. It is not a live document connector, upload
  service, permission sync, RAG index, model gateway, authentication layer, or customer data plane.

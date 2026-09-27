# Delphi — Earnings-to-Thesis Prototype (v0.3)

> **Models propose. Validators constrain. Humans approve. The ledger records.**

Delphi is an AI-native **Investment Decision OS** for fundamental investment teams. This repository contains the
interactive prototype of the first workflow — **Earnings-to-Thesis** — plus the public company website, built to the
v0.2 specification in [`Delphi_Prototype_and_EFL_Pack_v0_2/`](Delphi_Prototype_and_EFL_Pack_v0_2/).

**The default MSFT event uses frozen official public sources. Its thesis, forecast, and inferred deltas are demo-authored—not a real institution's view. ARCT-DEMO is synthetic. Nothing here is investment advice.**

## What the prototype proves

One coherent, governed loop:

```text
Frozen MSFT FY2025 Q4 official-source event
→ compare with a clearly labeled demo-derived thesis v12
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
  by default, `/context` shows a policy-checked interactive Context Library, and `/debug/graph`
  exposes its deterministic read-only product projection with no graph database.

## Live Desk (real filings, real model)

`/live` runs Earnings-to-Thesis on the **latest SEC EDGAR earnings release** (8-K Item 2.02, Ex. 99.1) against a
point-in-time demo thesis:

- The model is OpenAI or Anthropic, chosen by env; see `.env.example`.
- Model output is untrusted. Every cited quote must appear verbatim in the filing. Every number must be present in, or
  deterministically derivable from, the cited evidence. Every patch must be allowlisted.
- Anything that fails is **blocked and shown with its reason**. Approved changes go through the same transition gateway
  and ledger as the demo.
- Forecast outcomes are recorded in `actualValue`, beside the team's forecast, never over it.
- Run files from `npm run analyze` or `npm run eval` can be imported. They are re-verified on import, and tampered
  files are rejected.

```bash
npm run analyze -- --ticker NVDA          # CLI run → data/live-runs/*.json
npm run eval                              # 6-case eval → evals/reports/*.md (see evals/README.md)
```

Live runs require `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, plus `DELPHI_SEC_USER_AGENT`. In production they also
require `DELPHI_LIVE_ACCESS_TOKEN`. Workspaces persist in the browser only, since there is no server database yet.

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
npm test                  # Vitest unit + contract tests
npm run test:e2e          # Playwright E2E (starts its own dev server on :3050)
npm run verify:sources    # offline source/provenance/hash contract
npm run verify:sources -- --refresh # developer-only public-source drift check
node scripts/capture-screenshots.mjs   # regenerate website screenshots from the live app
```

## Routes

| Surface | Route |
|---|---|
| **Public website** | `/` (`#thesis` `#prototype` `#system` `#stage` `#contact`) |
| **Change Inbox** (demo home) | `/demo` |
| Investment Case | `/cases/msft-fy25q4` · `/cases/arct-demo` |
| Context Library | `/context` |
| Delta Review | `/deltas/proposal_msft_azure_001` (any proposal ID) |
| Run Observatory | `/runs/run-msft-fy25q4` · `/runs/run-arct-degraded` |
| Decision Ledger | `/ledger` · `/ledger/:transitionId` |
| Trust / Privacy Receipt | `/trust` · `/trust/run-msft-fy25q4` |
| Context compatibility redirect | `/debug/context` → `/context` |
| Internal graph projection debug | `/debug/graph` |
| Legacy website redirect | `/website` → `/` |
| **Live Desk** (real SEC filings) | `/live` · `/live/:runId` |
| **User guide** (customer-facing) | `/guide` |

> The public company website owns `/`. The deterministic product prototype starts at `/demo`; deep product routes remain stable.

Current implementation notes: [architecture](docs/architecture-v0.3.md), [trust boundaries](docs/trust-and-data-boundaries-v0.3.md),
[demo script](docs/demo-script-v0.3.md), and [source register](docs/source-register.md).

## Architecture

```text
app/                      Next.js App Router
├── page.tsx              public company website
├── website/              compatibility redirect to `/`
└── (product)/            product surfaces (demo, cases, deltas, runs, ledger, trust)
src/
├── domain/               types · zod schemas · semantic patch engine · transition
│                         gateway · policies · validators · content hashing
├── fixtures/             legacy ARCT fixtures + MSFT official-source snapshots + schema loader
├── context/              context binding/hash validation + browser-local import
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
- The fund-context boundary normalizes official issuer, SEC, and CalPERS snapshots alongside demo-authored state. It
  records origin, publisher, canonical URI, retrieval, rights, classification, point-in-time scope, model policy,
  lifecycle, input usage, and derived links. Browser-local imports persist only bounded text previews, metadata, and
  hashes; raw bytes are not stored or uploaded.

## Fixture mode (default and only demo mode)

Fixtures in `src/fixtures/data/` are schema-validated with Zod at load. The default v0.3 scenario contains frozen,
hashed official public source snapshots for Microsoft FY2025 Q3/Q4, the FY2025 annual-report page, a CalPERS public
policy, and a SEC Form 13F holding row. The approved pre-event thesis and team forecast are explicitly
`demo_derived`. The public CalPERS references do not establish a CalPERS thesis, recommendation, active decision, or
endorsement. Runtime execution remains deterministic and offline; the optional refresh command is developer-only.

## Demo script (90-second path)

1. **Problem** — inbox shows material changes, not a chat box.
2. **Change Inbox** → open Microsoft FY2025 Q4 and note “Real event · demo thesis.”
3. Open the high-materiality **Thesis Delta**; open the exact **evidence** excerpt.
4. **Human review** — Accept the medium-materiality item (or Edit; note the Analyst is blocked from the PM-required
   item and prompted to escalate).
5. **Apply approved changes** → open the **Decision Ledger** entry: v12 → v13, before/after diff, evidence, actor,
   workflow/model versions.
6. Close: governed investment state persists across models.

The four-minute path adds: Context Library provenance and local import, Investment Case context coverage,
deterministic replay and declared inputs, all four proposals, the Analyst/PM role switcher, the synthetic ARCT degraded
run (missing transcript → blocked proposal → escalate), Privacy Receipt, and the CTA on `/website`. Before any demo:
click **Reset demo**.

## Security disclaimer

This is a **pre-launch prototype using frozen public-source snapshots and demo-authored investment context**. It runs
entirely in the local browser session; no raw local-import content is sent to any cloud, no external web access occurs
at runtime, and no secrets exist in the repository or client bundle. The customer-owned data-plane separation described on the website and Trust page is a **target
architecture / roadmap direction** — not a deployed or certified capability. No SOC 2, penetration-testing, retention,
or MNPI-compliance claims are made.

## Known limitations

- Demo state lives in `localStorage` (single browser profile); there is no server persistence or authentication —
  intentional for the prototype stage (`07_SECURITY_PRIVACY_TRUST.md` §12).
- The role switcher simulates Analyst/PM identity; it is a demo affordance, not access control.
- MSFT is the primary happy path; ARCT-DEMO remains a controlled synthetic degradation scenario.
- Rollback is limited to the most recent transition (safe demo flow).
- Context attachment changes browser-local case context but cannot retroactively alter the frozen run's recorded input usage.
- The live-model adapter is a typed stub; wiring a provider requires implementing it server-side (never required for
  the demo).
- The graph debug page is a deterministic in-memory projection, not a graph database or durable graph service.
- The Context Library is a catalog and browser-local parsing demonstration. It is not a live document connector,
  permission sync, RAG index, model gateway, authentication layer, or customer data plane.

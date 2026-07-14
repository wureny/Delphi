# Delphi Prototype Build Brief for Claude Code / Codex

**Objective:** build a polished, deterministic, interactive web prototype of Delphi’s Earnings-to-Thesis workflow, plus a matching public company website.

This file is written to be pasted into a coding agent. The coding agent should also receive:

- `02_PROTOTYPE_PRD_ZH.md`
- `03_UX_AND_INTERACTION_SPEC_ZH.md`
- `04_SYSTEM_ARCHITECTURE.md`
- `05_DOMAIN_MODEL_AND_API_CONTRACTS.md`
- `06_AGENT_WORKFLOW_AND_EVALS.md`
- `07_SECURITY_PRIVACY_TRUST.md`
- `13_DEMO_SCRIPT_AND_ACCEPTANCE.md`

---

# 1. Master instruction

Build a production-quality **prototype**, not a fake screenshot and not a production financial platform.

The prototype must prove one coherent loop:

```text
Synthetic earnings event
→ compare against approved thesis v12
→ produce cited Thesis Delta Proposals
→ human Accept / Edit / Reject / Escalate / Defer
→ approved changes create thesis v13
→ Decision Ledger records before/after, evidence, actor, workflow, and versions
```

The app must work completely offline in deterministic fixture mode. A live LLM adapter may be added only behind the same typed interface and must not be required for the demo.

Do not build:

- automated trading;
- portfolio optimization;
- generic chat as the home page;
- arbitrary agent creation;
- real customer integrations;
- a graph database;
- enterprise auth;
- a complicated microservice architecture;
- unsupported security claims;
- a terminal animation with no domain meaning.

---

# 2. Preferred stack

Use a single TypeScript repository.

Recommended:

```text
Next.js App Router
TypeScript with strict mode
Tailwind CSS
shadcn/ui or accessible headless primitives
Zod for runtime validation
Zustand or a small typed store for demo state
Vitest for unit and contract tests
Playwright for key end-to-end flows
Lucide icons
```

Data:

```text
versioned JSON fixtures
+ local persisted demo state
+ service abstraction that can later use Postgres
```

Streaming:

```text
SSE-compatible event abstraction
```

For the prototype, simulated timed events are acceptable. Keep event objects real and typed.

Do not pin library versions in this document. Initialize with current stable releases and commit the lockfile.

---

# 3. Repository structure

```text
delphi/
├── apps/
│   ├── product/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── public/
│   └── website/
│       ├── app/
│       ├── components/
│       └── public/
├── packages/
│   ├── domain/
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   ├── transitions.ts
│   │   └── policies.ts
│   ├── fixtures/
│   │   ├── data/
│   │   └── loader.ts
│   ├── runtime/
│   │   ├── orchestrator.ts
│   │   ├── event-stream.ts
│   │   ├── model-adapter.ts
│   │   ├── fixture-adapter.ts
│   │   └── validators/
│   └── ui/
├── tests/
│   ├── contracts/
│   ├── unit/
│   └── e2e/
├── docs/
└── README.md
```

A simpler single-app structure is acceptable if the code remains modular. Do not create monorepo complexity unless it improves delivery.

---

# 4. Required routes

Product:

```text
/                         Change Inbox
/cases/arct-demo          Investment Case
/deltas/proposal-arct-001 Delta Review
/ledger                   Decision Ledger
/ledger/:transitionId     Ledger detail
/runs/run-arct-success    Run Observatory
/trust/run-arct-success   Privacy Receipt
```

Website:

```text
/
#product
#how-it-works
#security
#company
#contact
```

The product and website should share visual identity but clearly differ in purpose.

---

# 5. Required fixture

Use the synthetic company:

```yaml
company: Archetype Systems
ticker: ARCT-DEMO
sector: AI infrastructure software
case_id: case_arct_001
approved_thesis_version: 12
event: FY2026 Q2 Earnings
```

Create:

- approved thesis v12;
- three thesis pillars;
- five forecasts;
- three risks;
- three open questions;
- earnings release;
- transcript;
- team forecast;
- successful run;
- degraded run;
- four delta proposals;
- expected thesis v13;
- expected ledger transition;
- privacy receipt.

At least one proposal should:

- support an existing pillar;
- weaken a pillar;
- request forecast review;
- create a new open question.

The degraded case should remove or mark the transcript unavailable and block one high-impact proposal.

All fixture files must include:

```json
{
  "fixtureVersion": "0.2.0",
  "schemaVersion": "2026-07-13",
  "synthetic": true
}
```

---

# 6. Required application behavior

## Change Inbox

- cards or high-density rows;
- filters for Needs review, Escalated, Approved, Degraded;
- default item opens ARCT-DEMO review;
- materiality and evidence-health visible;
- synthetic demo badge;
- no chat-first interface.

## Investment Case

- approved thesis version and owner;
- thesis pillars;
- forecasts;
- risks;
- open questions;
- history timeline;
- clear labels for Approved team state versus Agent proposal.

## Run Observatory

- deterministic replay button;
- simulated runtime event stream;
- dual-pane layout;
- inspect structured finding;
- event durations;
- object refs;
- successful and degraded modes;
- no hidden chain-of-thought display.

## Delta Review

- structured delta cards;
- evidence drawer;
- action controls;
- Accept preview;
- Edit with original proposal retained;
- Reject reason;
- Escalate target;
- Defer date;
- only approved actions mutate formal state.

## Decision Ledger

- version transition v12 → v13;
- actor and reviewer;
- evidence refs;
- model / workflow / skill version;
- before / after diff;
- review history;
- rollback button can be a safe demo flow.

## Privacy Receipt

Must reflect actual prototype behavior:

```text
Synthetic data
Fixture adapter
No external web access
No raw content sent to Delphi Cloud
No support access
Canonical writes proposed / approved
```

## Reset

A visible reset command restores initial fixture hashes and state.

---

# 7. State rules

Implement the rules in domain code, not UI conditionals scattered across components.

1. `reject`, `escalate`, and `defer` never modify approved thesis.
2. `accept` can apply the validated patch if role and policy allow.
3. `edit` creates a human-authored patch, validates it, then applies.
4. high materiality requires PM in the demo.
5. degraded high-impact proposal cannot be accepted by analyst.
6. a transition must reference current `fromVersion`.
7. duplicate approval is idempotent.
8. successful transition increments version exactly once.
9. all review actions appear in history.
10. reset is deterministic.

---

# 8. Runtime and model adapter

Define:

```ts
export interface AnalysisAdapter {
  run(input: AnalysisInput): AsyncIterable<RunEvent>;
}
```

Implement:

```text
FixtureAnalysisAdapter — required
LiveModelAnalysisAdapter — optional
```

The fixture adapter should emit meaningful events with short delays so the process is observable. Tests should support zero-delay mode.

The optional live adapter:

- requires server-side environment variables;
- validates structured output;
- cannot write canonical state;
- has timeout and safe fallback;
- shows mode and model route in UI;
- is hidden when not configured.

---

# 9. Validators

Implement at least:

```text
validateSchema
validateReferenceScope
validateEvidenceRefs
validateCitationCoverage
validateNumbers
validateAllowedSemanticPatch
validateCurrentVersion
validateAuthorization
validateDegradedPolicy
validateIdempotency
```

Return typed `ValidationResult`.

The model or fixture should not be trusted merely because it matches TypeScript at compile time; fixture loading also passes Zod schemas.

---

# 10. Design requirements

Visual direction:

- dark institutional UI;
- high information density;
- restrained accent;
- crisp borders;
- monospace for IDs and versions;
- clear status labels;
- no excessive gradients;
- no stock images;
- no fake customer logos;
- no impossible numbers or “AI confidence 99%”.

Use responsive layout.

Accessibility:

- keyboard focus;
- semantic buttons;
- labels;
- reduced motion;
- contrast;
- status not expressed only by color.

All controls must work or be intentionally disabled with explanation.

---

# 11. Website requirements

Build the marketing site from `11_WEBSITE_COPY_EN.md`.

At minimum:

- hero;
- problem;
- Earnings-to-Thesis loop;
- product screenshots;
- human control;
- Decision Ledger;
- graceful degradation;
- security / data-plane direction;
- design-partner pilot;
- final CTA;
- FAQ;
- legal footer.

Use real screenshots or embedded product components where practical. Do not use unsupported certification badges or customer logos.

CTA can open a mailto or controlled contact form placeholder configured by environment variable.

---

# 12. Tests

## Unit / contract

- fixture schemas load;
- evidence refs resolve;
- proposal patches are allowed;
- unauthorized write fails;
- stale version fails;
- reject/escalate/defer do not mutate;
- accept mutates once;
- edit attributes human actor;
- degraded policy blocks unsafe approval;
- reset returns original hashes;
- privacy receipt matches mode.

## End-to-end

### E2E 1 — successful review

1. open inbox;
2. open ARCT-DEMO;
3. replay successful run;
4. open evidence;
5. accept a medium change;
6. edit another;
7. escalate high materiality;
8. open ledger;
9. verify v12 → v13 and only approved patches.

### E2E 2 — degraded run

1. simulate missing transcript;
2. run;
3. verify degraded banner;
4. verify blocked proposal;
5. escalate;
6. verify no canonical transition for blocked item.

### E2E 3 — reset

1. create a transition;
2. reset demo;
3. verify v12 and empty transition list.

---

# 13. Documentation

README must include:

- what Delphi is;
- what the prototype proves;
- how to install;
- how to run product and website;
- how to run tests;
- fixture versus live mode;
- architecture diagram;
- security disclaimer;
- demo script;
- known limitations.

Generate `.env.example` with no secrets.

---

# 14. Implementation phases

## Phase A — domain and fixture closure

- schemas;
- fixtures;
- transition rules;
- validators;
- tests.

Do not start with visual polish before the state loop works.

## Phase B — product shell

- navigation;
- inbox;
- case;
- run;
- review;
- ledger;
- trust.

## Phase C — interaction closure

- all actions;
- persistence;
- reset;
- degradation;
- evidence drawer.

## Phase D — website and polish

- website;
- screenshots;
- responsive;
- accessibility;
- animations;
- copy review.

## Phase E — presentation validation

- run 90-second and 4-minute scripts;
- fix dead ends;
- test clean browser;
- test offline;
- record demo.

---

# 15. Definition of done

The build is done when a new evaluator can:

- understand the product without verbal setup;
- replay a deterministic earnings analysis;
- inspect evidence and runtime artifacts;
- distinguish Agent proposal from Approved team state;
- complete a valid approval;
- see the exact Decision Ledger transition;
- understand a degraded result;
- reset the demo;
- visit a matching, credible company website;
- complete all of this without an external API key.

---

# 16. Pasteable coding-agent prompt

```text
You are implementing the Delphi Earnings-to-Thesis prototype.

Read all attached Delphi v0.2 documents before writing code. Treat the PRD, domain contracts, architecture, security rules, and acceptance criteria as requirements.

Build a polished TypeScript web application that demonstrates:
synthetic earnings event → validated thesis delta proposals → human review → approved thesis version update → Decision Ledger.

The default mode must be deterministic and work without network or model API keys. Implement real typed domain objects, fixture validation, review authorization, state-transition rules, runtime events, evidence links, degraded mode, persistence, and reset. Do not create a chat-first app, automated trading, arbitrary agents, or fake enterprise claims.

First inspect the existing repository. If an older Delphi thesis prototype exists, reuse only clean contracts or components that fit the new PRD. Do not preserve obsolete product scope merely to avoid refactoring.

Before coding, produce:
1. repository assessment;
2. proposed file plan;
3. identified conflicts with the specification;
4. implementation checklist.

Then implement in small, testable increments. After each phase, run typecheck, unit tests, and relevant E2E tests. Do not declare completion while controls are dead, the state transition is only visual, or the demo depends on an external provider.

The final deliverable must satisfy every item in 13_DEMO_SCRIPT_AND_ACCEPTANCE.md.
```

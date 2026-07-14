# Delphi Demo Script, Evaluator Narrative & Acceptance

**Audience:** EFL reviewers, investors, design partners  
**Goal:** demonstrate a governed decision loop, not model theatrics

---

## 1. The one-sentence setup

> Delphi turns a material market event into a cited, human-reviewed change in the fund’s approved investment view.

Do not begin with architecture. Begin with the workflow problem.

---

## 2. 90-second EFL version

### 0:00–0:12 — problem

“Investment teams now have excellent AI search and summarization, but after earnings they still manually reconcile what happened against what the team officially believed. The state change—what changed, who approved it, and why—is fragmented.”

### 0:12–0:25 — Change Inbox

Open the inbox.

“This is not a chat home page. Delphi starts with material changes that need a decision. Archetype Systems has a new earnings event with four proposed deltas and one evidence conflict.”

### 0:25–0:45 — Delta

Open the high-materiality delta.

“Delphi shows what changed, how it differs from thesis version 12, why it matters, exact evidence, and what remains unknown. The model has proposed a change; it has not changed the team’s view.”

Open one evidence excerpt.

### 0:45–1:05 — human review

Edit or accept a medium-materiality item.

“The analyst can accept, edit, reject, escalate, or defer. This edit is attributed to the analyst. A high-materiality change requires PM approval.”

### 1:05–1:20 — Ledger

Open the new ledger entry.

“Only the approved change created thesis version 13. The ledger preserves before and after state, evidence, actor, and workflow/model versions.”

### 1:20–1:30 — thesis

“Models will change. Delphi’s durable value is the governed investment state that persists across models and tools.”

Stop. Do not add a five-minute architecture monologue.

---

## 3. Four-minute product version

### 0:00–0:30 — frame

- investment teams have tools;
- gap is formal state maintenance;
- first workflow is Earnings-to-Thesis;
- synthetic demo data.

### 0:30–1:00 — approved case

Show thesis v12:

- three pillars;
- forecasts;
- risks;
- open questions;
- owner and approved state.

Say:

“Delphi knows the starting state. Without that, an earnings summary cannot be ‘against our view.’”

### 1:00–1:35 — replay run

Start deterministic replay.

Show:

- sources loaded;
- facts reconciled;
- thesis impact;
- counterevidence;
- validator;
- proposal.

Say:

“These are externally meaningful runtime artifacts—not hidden chain of thought. Agents receive bounded tasks; validators own evidence, numeric, reference, and policy checks.”

### 1:35–2:25 — review proposals

Review:

1. one supported pillar;
2. one weakened pillar;
3. one forecast review;
4. one new open question.

Open exact evidence.

Perform:

- Accept medium;
- Edit medium;
- Escalate high;
- Reject one duplicate / not material item.

### 2:25–3:05 — Decision Ledger

Show:

- v12 → v13;
- only accepted/edited changes;
- rejected/escalated unchanged;
- human actor;
- evidence;
- model/skill/workflow version;
- before/after diff.

### 3:05–3:35 — degraded case

Trigger missing transcript.

Show:

- degraded banner;
- partial findings retained;
- one proposal blocked;
- explicit reason;
- no unsafe state update.

Say:

“An honest incomplete result is more useful than a complete-looking guess.”

### 3:35–4:00 — security and vision

Open Privacy Receipt.

“Today this public demo is synthetic and local. The target architecture separates Delphi’s control plane from a customer-owned data plane. The long-term product is the fund’s harness, not the model’s harness.”

End with design-partner CTA.

---

## 4. Design-partner version

Before demo, ask the customer to describe one recent earnings workflow.

Questions:

- Where was the approved thesis before the event?
- Which numbers did the analyst compare?
- Where were changed assumptions recorded?
- Which items reached the PM?
- What was approved versus discussed?
- How would the team reconstruct the decision now?
- Which data could not leave the customer environment?

Then map their process to the demo. Avoid pretending the fixture proves their workflow.

---

## 5. Investor Q&A responses

### “Why isn’t this a feature in AlphaSense, Hebbia, Rogo, or Finster?”

“Those platforms validate strong demand for finance-specific AI and increasingly cover search, agents, private data, workflow automation, citations, and auditability. Delphi is not betting those capabilities stay absent. We are centering the product on the fund’s canonical approved state and the governed transition into that state. Whether this is sufficiently distinct and defensible is exactly what the first design partners and pilots must test.”

### “Why can’t a fund build it?”

“A fund can build a demo quickly. Production responsibility includes source entitlement, point-in-time correctness, durable workflows, permissions, review, model and skill regression, audit, deployment, deletion, and ongoing connector maintenance. Our first ICP is large enough to need that reliability but small enough not to have a mature internal AI platform.”

### “Where is the moat if models improve?”

“Better models improve proposal quality. Delphi retains the approved state, permissions, workflow, evaluation, and decision history. The system should benefit from model progress rather than depend on one model.”

### “Does it generate alpha?”

“We do not claim alpha. The first proof is operational and epistemic: faster review, valid evidence, accurate numbers, higher materiality precision, better attention allocation, and reconstructable decisions.”

### “What is actually built?”

Answer only with current facts:

“The repository contains a runnable Next.js prototype with a complete fixture-backed Earnings-to-Thesis path, typed
domain contracts, deterministic replay, human review and authorization, semantic v12 → v13 transitions, rollback,
Privacy Receipts, a synthetic fund-context ingestion boundary, an internal read-only graph projection, and a public
website. The verified local release has 73 Vitest unit/contract tests and 9 Playwright E2E scenarios. Live document
connectors, live LLM execution, graph persistence, authentication, and the customer data plane are explicit backend
roadmap work, not current capabilities.”

Never merge the prior thesis prototype, current HTML wireframe, and future production architecture into one claim.

### “How do you handle MNPI?”

“The initial prototype is synthetic and the first pilot should use carefully scoped public/licensed data plus customer-approved read-only state. The target architecture supports data classification, isolated model routes, customer-owned runtime, explicit policy, and compliance gates. Exact MNPI controls require customer policy and legal review; we do not claim completed compliance today.”

---

## 6. Demo failure plan

### Level 1 — normal

Use deployed product with fixture mode.

### Level 2 — local

Run from local repository with network disabled.

### Level 3 — static interactive backup

Open `html/Delphi_Prototype_Wireframe.html`.

### Level 4 — recording

Keep a 90–150 second screen recording available.

The demo should never require a live model or provider.

---

## 7. Before every demo

- [ ] use clean browser profile;
- [ ] reset demo;
- [ ] verify synthetic-data badge;
- [ ] test successful replay;
- [ ] test degraded replay;
- [ ] verify evidence drawers;
- [ ] verify review roles;
- [ ] verify v12 → v13;
- [ ] confirm the State diff contains a governed value change and no metadata-only transition;
- [ ] verify privacy receipt;
- [ ] inspect `/debug/graph` and confirm proposal → evidence / thesis relationships are projection-only;
- [ ] inspect `/debug/context`, filter Internal working context, and confirm model/memo ACL, point-in-time, blocked
      external-model access, zero transfer, and graph links;
- [ ] verify website and product URLs;
- [ ] verify `alixwu2004@gmail.com` contact actions;
- [ ] hide developer tools and secrets;
- [ ] disable notifications;
- [ ] confirm all public claims match current build.

---

## 8. Product acceptance checklist

### Domain closure

- [ ] approved state is a real object;
- [ ] run state is separate;
- [ ] proposal is separate;
- [ ] review is separate;
- [ ] state transition is real and persisted;
- [ ] ledger entry references before/after and evidence.
- [ ] direct and net-effect no-op transitions are rejected before versioning;
- [ ] v12 → v13 ledger diff contains at least one governed structural change.

### Interaction closure

- [ ] Accept works;
- [ ] Edit works and attributes human;
- [ ] Reject works with reason;
- [ ] Escalate works without mutation;
- [ ] Defer works without mutation;
- [ ] authorization rule enforced;
- [ ] reset works.

### Evidence closure

- [ ] each factual claim links to exact excerpt;
- [ ] numeric values show unit and basis;
- [ ] unavailable evidence is visible;
- [ ] source drawer shows published/observed time;
- [ ] unsupported claims are blocked or unknown.

### Runtime closure

- [ ] events stream or replay;
- [ ] object refs inspectable;
- [ ] degraded mode is first-class;
- [ ] partial results survive;
- [ ] no fake hidden reasoning is displayed.
- [ ] runtime labels and Privacy Receipt match the selected fixture adapter and current write counts;
- [ ] graph debug projection is current, read-only, and contains only resolved Delphi IDs.
- [ ] context manifest contains only fixture-simulated read-only connectors and validated Delphi IDs;
- [ ] internal context exposes owner/ACL/point-in-time/model policy without displaying raw private content;

### Presentation closure

- [ ] first-time user understands it is not chat;
- [ ] 90-second script works;
- [ ] four-minute script works;
- [ ] screenshots are clean;
- [ ] website uses same language;
- [ ] mobile website works;
- [ ] no unsupported logos or security badges.

---

## 9. Evidence package for EFL

Include or link:

1. public website;
2. live prototype;
3. 90–150 second video;
4. architecture image;
5. one Decision Ledger screenshot;
6. one degraded-mode screenshot;
7. concise deck;
8. six-month milestone slide;
9. customer-discovery summary;
10. founder / IP facts.

The prototype should support the application, not force the application committee to reverse-engineer the product.

# Delphi Company Website — Information Architecture & Copy

**Primary audience:** fundamental investment teams, design partners, EFL / investors  
**Primary CTA:** Request a design-partner conversation  
**Secondary CTA:** View the product walkthrough  
**Tone:** precise, calm, evidence-first, institutional

---

## 1. Sitemap

```text
/
├── Product
│   ├── Earnings-to-Thesis
│   ├── Decision Ledger
│   └── Trust & Deployment
├── For Investment Teams
├── Security
├── Company
└── Request a Demo
```

For the first public launch, a single responsive page plus `/security` and `/demo` is enough.

---

## 2. Home page

### Meta

**Title:** Delphi — The Decision Layer for Fundamental Investment Teams  
**Description:** Delphi compares material events against your approved investment view, proposes cited thesis changes, and records only what your team approves.

---

### Navigation

```text
Delphi
Product
How it works
Security
Company
Request a demo
```

---

### Hero

**Eyebrow**

AI-native investment decision infrastructure

**Headline**

# From market events to governed investment decisions.

**Subhead**

Delphi compares new evidence against your team’s approved thesis, identifies what changed, and turns only human-approved updates into a point-in-time Decision Ledger.

**Primary CTA**

Request a design-partner conversation

**Secondary CTA**

See the workflow

**Trust line**

Models propose. Your team decides. Every approved change keeps its evidence and history.

**Hero product visual**

Use a real screenshot of:

- Change Inbox on the left;
- selected Thesis Delta on the right;
- evidence and approval status visible.

Avoid abstract AI graphics.

---

### Problem section

**Headline**

## Your team has more answers than ever—and no formal system for how the view changes.

**Body**

Financial teams already use data terminals, research platforms, Excel models, shared drives, chat, and AI. After earnings, analysts still reconcile numbers, compare management commentary with the current thesis, update fragmented trackers, brief the PM, and preserve the reasoning manually.

A generated report can summarize the event. It cannot tell the institution what it officially believed before, who approved a new view, or how to reconstruct the decision later.

**Three problem cards**

1. **State is fragmented**  
   Thesis, forecasts, risks, and open questions live in different files and conversations.

2. **AI output is not governed**  
   A confident answer does not have authority to change formal investment state.

3. **Decision history disappears**  
   Months later, teams struggle to recover what evidence was available and why the view changed.

---

### Product loop section

**Headline**

## The first workflow: Earnings-to-Thesis

```text
1. Detect the event
2. Reconcile facts and forecasts
3. Compare against the approved thesis
4. Propose material deltas
5. Review and approve
6. Record the state transition
```

**Body**

Delphi does not default to another long report. It creates a small set of cited, reviewable changes.

---

### Product object section

**Headline**

## Review the delta, not the document.

**Example card copy**

**Weakens · High materiality**

**Mid-market demand durability is less certain**

**What changed**  
Net retention fell below the team’s expected range, while management cited longer implementation cycles.

**Against our view**  
The approved thesis assumes stable implementation velocity and resilient expansion.

**Why it matters**  
A sustained slowdown would reduce the FY27 base-case growth assumption.

**Evidence**  
Q2 shareholder letter §3 · Earnings call 12:41

**Unknown**  
The duration of the delay is not yet quantified.

**Actions**  
Accept · Edit · Reject · Escalate · Defer

---

### Human control section

**Headline**

## Flexible AI reasoning. Deterministic state control.

**Four steps**

```text
Agent inferred
Analyst confirmed
PM approved
System recorded
```

**Body**

Agents receive bounded tasks and tools. Validators check evidence, numbers, references, policy, and authorization. Formal state changes only after the required human approves them.

---

### Decision Ledger section

**Headline**

## Reconstruct what the team knew and decided—at the time.

**Body**

Every approved change records the before and after state, evidence, responsible reviewer, workflow, model, and skill versions. The result is a point-in-time decision history that can support review, learning, and accountability without relying on hidden chain of thought.

**Visual**

Before/after thesis diff plus evidence lineage.

---

### Degradation section

**Headline**

## Honest gaps are better than complete-looking guesses.

**Body**

When a source is missing, numbers conflict, or a model output fails validation, Delphi makes the limitation visible. Safe partial results remain available; unsupported sections are blocked or escalated.

---

### Integration section

**Headline**

## Improve the workflow before replacing the tools.

**Body**

Delphi is designed to connect with the systems investment teams already use:

```text
Research and market data
Excel models
SharePoint / Drive
Slack / Teams / Email
PMS / OMS / risk systems
Customer-approved model endpoints
```

**Copy**

Keep the tools that work. Replace the manual connective tissue between them.

Do not show partner logos unless permission or real integration exists. Use text categories in the prototype website.

---

### Security section

**Headline**

## Designed around the customer trust boundary.

**Body**

The target institutional architecture separates a Delphi-managed Control Plane from a customer-owned Data Plane. Research content, thesis, positions, embeddings, credentials, keys, runtime, and model endpoints can remain in the customer environment.

**Feature cards**

- Human-authorized write-back
- Versioned model and workflow records
- Data classification and policy routing
- Customer-owned deployment direction
- Visible Privacy Receipt
- Export and deletion path

**Qualifier**

Deployment capabilities are staged and should be represented accurately for the current product version.

---

### Audience section

**Headline**

## Built for the entire investment decision chain.

**Analyst**  
Review cited changes, preserve judgment, and update state once.

**PM / CIO**  
Focus attention on the deltas that may actually change the view.

**Head of Research**  
Maintain thesis discipline and institutional memory.

**COO / CTO / CCO**  
Control data, models, permissions, approvals, and audit evidence.

---

### Pilot section

**Headline**

## Start with one event, not a platform migration.

**Body**

The design-partner sequence is intentionally narrow:

```text
Reverse Demo
→ One-Event Proof
→ 4–8 week shadow pilot
→ controlled production
```

**Pilot scope**

- 10–20 names;
- one earnings workflow;
- read-only state;
- no automated trading;
- weekly review;
- measurable citation, numeric, materiality, and review-time outcomes.

**CTA**

Discuss a design-partner workflow

---

### Company / vision section

**Headline**

## The fund’s harness—not the model’s harness.

**Body**

Models, providers, and agent frameworks will change. A fund’s approved thesis, permissions, workflow, decision history, and evaluation data should persist. Delphi is building the governed institutional state that allows stronger models to become useful without becoming an uncontrolled black box.

---

### Final CTA

# Make every change in conviction traceable.

Request a design-partner conversation  
View the product walkthrough

`[FOUNDER INPUT REQUIRED: contact, scheduling, legal name, social links]`

---

### Footer

```text
Delphi
Product · Security · Company · Contact
© 2026 [LEGAL ENTITY]
Not investment advice.
Privacy · Terms
```

---

## 3. Product page

### Title

Earnings-to-Thesis

### Headline

## Turn an earnings event into a reviewable change in the investment view.

### Sections

1. Sources and approved state;
2. facts and forecast reconciliation;
3. thesis impact;
4. risk and counterevidence;
5. human review;
6. Decision Ledger;
7. runtime observability;
8. degraded mode;
9. pilot metrics.

Use product screenshots, not generic illustrations.

---

## 4. Security page

### Headline

## AI adoption starts with explicit boundaries.

### Page sections

- architecture overview;
- customer-owned Data Plane direction;
- data classification;
- model routing;
- human approval;
- logging;
- Privacy Receipt;
- retention / deletion / export;
- current product status and roadmap;
- contact for security review.

### Claims rule

Do not use certification badges or “zero retention” unless the exact deployment is implemented and contractually verified.

---

## 5. Company page

### Headline

## Building the institutional decision layer for AI-native capital markets.

### Copy

Delphi began with a systems question: how can an investment institution use increasingly capable AI while preserving stable research objects, evidence lineage, human authority, and point-in-time history?

The answer is not another chatbot. It is a governed state machine for investment decisions.

`[FOUNDER INPUT REQUIRED: founder bio, why now, location, incorporation, advisors, careers]`

---

## 6. FAQ

### Is Delphi an AI analyst?

Delphi uses models to analyze evidence and propose changes, but it does not replace the analyst’s or PM’s final judgment. Formal state changes require authorized human review.

### Does Delphi make trades?

No. Automated trading and position changes are outside the initial product scope.

### Does Delphi replace Bloomberg, FactSet, AlphaSense, or Excel?

No. Delphi is designed to connect existing tools and govern the transition from new evidence to approved investment state.

### What makes Delphi different from financial search or AI workflow platforms?

Delphi is centered on canonical investment state, human-authorized state changes, point-in-time decision history, and firm-specific materiality—not only search, generation, or task automation.

### Can Delphi run in our environment?

Customer-owned deployment is part of the target institutional architecture. Exact options depend on product stage and customer requirements.

### What data is used for the public demo?

Synthetic data. No real customer research or position data is used.

### Does Delphi guarantee better investment performance?

No. Delphi is designed to improve research operations, evidence quality, attention allocation, decision traceability, and institutional memory. It does not promise alpha.

---

## 7. Visual direction

- dark, restrained interface;
- real product screenshots;
- high information density;
- subtle grid / ledger motifs;
- no stock-photo traders;
- no floating robot heads;
- no excessive gradients;
- no unsupported customer logos;
- use architecture and evidence lineage as visual proof.

The included `html/Delphi_Company_Website_Mockup.html` is a self-contained visual reference.

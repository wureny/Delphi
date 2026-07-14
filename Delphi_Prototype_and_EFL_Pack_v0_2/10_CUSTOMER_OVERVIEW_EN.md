# Delphi — Continuous Investment Decision Infrastructure

**For:** CIOs, PMs, Heads of Research, COOs, CTOs, CISOs, and CCOs  
**Initial workflow:** Earnings-to-Thesis  
**Status:** design-partner / prototype material

---

## The problem

Your team already has market data, research platforms, Excel models, shared drives, chat, and AI tools.

After every material event, the hardest questions remain:

- What changed relative to our approved view?
- Which forecast, assumption, thesis pillar, or risk needs review?
- What evidence supports or contradicts the change?
- What remains unknown?
- Who approved the new view?
- Can we reconstruct the decision exactly as it was made at the time?

Most AI tools can create another summary. They do not maintain the fund’s formal investment state.

---

## What Delphi does

Delphi compares new evidence with the team’s approved thesis and generates a cited **Thesis Delta Proposal**.

```text
Earnings release, filing, and call
→ facts and numbers reconciled
→ compared against team forecasts and approved thesis
→ material changes proposed
→ analyst / PM reviews
→ approved changes enter the Decision Ledger
```

The default output is a delta, not another long report:

```text
What changed
Against our view
Why it matters
Evidence
What remains uncertain
Recommended follow-up
Required reviewer
```

---

## The first workflow: Earnings-to-Thesis

After an earnings event, Delphi can:

1. organize the earnings release, filing, call, and relevant internal state;
2. reconcile reported figures and guidance against team forecasts;
3. identify supported, weakened, or contradicted assumptions;
4. flag forecast and model inputs that need review;
5. surface new risks and open questions;
6. create cited proposals;
7. route each proposal to the authorized reviewer;
8. record approved changes with complete before/after lineage.

Users can:

```text
Accept · Edit · Reject · Escalate · Defer
```

Models propose. Your team decides.

---

## By role

### Analyst

- reduce repetitive reading, number checking, and citation assembly;
- review changes instead of rewriting the same context;
- preserve private draft versus approved team state;
- update related records once, not across multiple trackers;
- retain final judgment and authorship.

### PM / CIO

- receive fewer, more material changes;
- see “against our view” immediately;
- distinguish fact, model inference, and team judgment;
- understand what is uncertain;
- trace every approved change to evidence and responsible people.

### Head of Research

- maintain consistent thesis, forecast, catalyst, and risk state;
- improve review and postmortem discipline;
- reduce institutional-memory loss;
- compare processes across names and time without flattening judgment.

### COO / CTO / CISO / CCO

- explicit data classes and model routes;
- versioned workflow and model records;
- human authorization and rollback;
- transparent retention and deletion path;
- customer-owned deployment option;
- audit-ready process artifacts rather than hidden model reasoning.

---

## What Delphi does not replace

Delphi is designed to work with:

- Bloomberg, FactSet, AlphaSense, and other data or research platforms;
- Excel financial models;
- Slack, Teams, and email;
- SharePoint, Drive, and research repositories;
- PMS, OMS, and risk systems;
- the analyst’s and PM’s final judgment.

It aims to replace fragmented manual trackers, duplicated summaries, unversioned thesis spreadsheets, and decisions that cannot be reconstructed.

---

## Human control

Production policy separates:

```text
Agent inferred
Analyst confirmed
PM approved
System recorded
```

A model output is a proposal. It does not become the team’s formal view unless the required human approves it.

Delphi does not automatically:

- make the final investment decision;
- change position size;
- execute a trade;
- share proprietary thesis across customers;
- send restricted data to an unapproved model;
- convert an unreviewed inference into official team state.

---

## Evidence and graceful degradation

Every material factual claim must link to an exact source excerpt.

If a transcript is missing, numbers conflict, a source is not licensed, or a model output fails validation, Delphi makes the gap visible. It can return a degraded but honest result rather than silently filling missing sections with unrelated evidence.

---

## Deployment and privacy direction

### Dedicated Managed

- isolated data plane for each customer;
- separate database, storage, keys, and queues;
- suited to early pilots and smaller teams.

### Customer Private

- runtime in the customer’s AWS or Azure environment;
- customer-owned data, IAM, KMS, secrets, and model endpoint;
- research content and prompts do not need to pass through Delphi’s Control Plane;
- Delphi receives signed software versions and content-free health metadata.

The exact mode depends on customer requirements and product stage.

---

## Shadow pilot

A proposed 4–8 week pilot:

- 10–20 positions or watchlist names;
- one primary workflow: Earnings-to-Thesis;
- one optional second event type;
- public / licensed evidence plus read-only thesis and forecast state;
- no automatic canonical write;
- no trading connection;
- weekly joint review.

### Pilot metrics

- event-to-review latency;
- analyst review time;
- citation validity;
- numeric accuracy;
- materiality precision;
- accept / edit / reject / escalate;
- whether the output changes research priority or triggers a model review;
- workflow usage and expansion interest.

The pilot should not promise alpha. It should prove decision-process value and trust.

---

## Design-partner conversation

A useful first meeting is not a generic demo.

We propose a **Reverse Demo**:

1. choose one recent earnings event;
2. show how your team currently reviewed it;
3. identify where thesis state, forecast comparison, approvals, and follow-up were recorded;
4. replay the same event in Delphi;
5. compare what was useful, wrong, missing, or unsafe.

The result should be a clear One-Event Proof and a decision about whether a shadow pilot is warranted.

---

## Expected outcome

Delphi is designed to help an investment team improve:

- research speed;
- coverage of material changes;
- evidence quality;
- PM attention allocation;
- thesis-maintenance discipline;
- decision traceability;
- institutional memory;
- AI governance.

> **Keep your tools. Keep human judgment. Add a governed decision layer.**

---

## Next step

**Design Partner Program**  
`[FOUNDER INPUT REQUIRED: contact email, scheduling link, website]`

Not investment advice. Product capabilities and deployment options remain subject to validation and implementation.

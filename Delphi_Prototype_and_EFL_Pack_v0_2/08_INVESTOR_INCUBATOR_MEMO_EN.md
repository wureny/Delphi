# Delphi — The Decision Layer for Fundamental Investment Teams

**Investor & Incubator Memo v0.2**  
**Prepared for:** early-stage investors, Endless Frontier Labs, strategic advisors  
**Status:** pre-product / prototype-stage; commercial assumptions require validation  
**Updated:** July 13, 2026

---

## Executive summary

Fundamental investment teams are adopting AI for search, reading, data synthesis, and report generation. Yet the most important part of their workflow remains largely manual: maintaining what the team officially believes as new evidence arrives.

Delphi is an AI-native Investment Decision OS for fundamental funds. It connects earnings materials, research documents, financial models, and the team’s approved thesis; identifies what changed; proposes which assumptions, forecasts, risks, and open questions should be updated; and records only the changes that authorized humans approve.

The initial product, **Earnings-to-Thesis**, turns a post-earnings research process into a cited, reviewable state transition:

```text
New earnings event
→ reconcile facts and forecasts
→ compare against the approved thesis
→ generate a Thesis Delta Proposal
→ analyst / PM review
→ record the approved change in a point-in-time Decision Ledger
```

Delphi is not another financial chatbot or autonomous trading agent. Its technical core is a governed state machine for institutional investment knowledge: typed domain objects, bounded agent execution, validated proposals, human authorization, and a replayable decision ledger.

---

## 1. The problem

Investment teams already have data terminals, Excel models, research repositories, chat tools, and AI assistants. The gap is between those systems.

After an earnings event, analysts still manually:

- reconcile reported numbers against team forecasts;
- compare management statements against the current thesis;
- determine which assumptions changed;
- update multiple trackers and documents;
- brief the PM;
- preserve a defensible record of what was known and decided at the time.

Current AI tools can produce polished summaries, but a summary is not an institutional decision state. It usually does not know which thesis version was approved, which forecast belongs to the team, who has authority to change it, or how to reconstruct that decision months later.

The result is slower review, duplicated work, inconsistent state, attention overload, and institutional memory that disappears into spreadsheets, folders, and conversations.

---

## 2. The product

### First workflow: Earnings-to-Thesis

Delphi ingests or receives a normalized earnings event and produces a compact set of deltas:

- **What changed**
- **Against our view**
- **Why it matters**
- **Evidence**
- **What remains uncertain**
- **Recommended follow-up**
- **Required reviewer**
- **Approval state**

The user can:

```text
Accept · Edit · Reject · Escalate · Defer
```

Only authorized, approved changes become part of the formal thesis and Decision Ledger.

### Product surfaces

1. **Change Inbox** — material changes awaiting review;
2. **Investment Case** — the current approved thesis, forecasts, catalysts, risks, and open questions;
3. **Delta Review** — cited proposals and approval actions;
4. **Decision Ledger** — before/after state, evidence, actor, workflow, model, and skill versions;
5. **Run Observatory** — externally meaningful tasks, tool calls, findings, validation, and degradation;
6. **Privacy Receipt** — where the workflow ran, what data class was used, which models and tools were called, and what was written.

---

## 3. Technical innovation

Delphi’s core is not a proprietary foundation model. It is an institutional state and control architecture.

### Typed investment state

The system gives stable identity and version to:

- InvestmentCase;
- Thesis and ThesisPillar;
- Assumption;
- Forecast;
- Catalyst;
- Risk;
- OpenQuestion;
- Claim and Evidence;
- Decision;
- Review and StateTransition.

### Bounded agent runtime

Agents receive task-scoped data and tools, produce typed findings, and terminate. They cannot invent arbitrary schema, bypass policy, or directly mutate approved state.

### Validated state transitions

Model output is treated as an untrusted proposal. Deterministic validators check schema, evidence, references, numbers, policy, duplication, and authorization before a human can approve a transition.

### Point-in-time Decision Ledger

Each approved change records:

- the prior and new state;
- evidence available at that time;
- source, workflow, skill, and model versions;
- reviewer and approver;
- timestamps;
- rollback and later outcome links.

### Graceful degradation

Missing transcripts, conflicting numbers, source failures, or rejected outputs become explicit degraded states. Delphi preserves partial results instead of presenting a complete-looking but weakly grounded answer.

### Customer-owned trust boundary

The target institutional deployment is a Delphi-managed Control Plane with a customer-owned Data Plane. Customer documents, thesis, positions, embeddings, runtime, credentials, keys, and model endpoints can remain in the customer environment.

---

## 4. Why now

Three forces are converging.

### AI research capabilities are becoming widely available

Search, summarization, deep research, agents, and report generation are rapidly becoming standard capabilities across model providers and financial platforms. This expands adoption while making generic generation a weak long-term moat.

### Financial institutions need workflow-level trust

As AI moves from individual experimentation into formal processes, institutions need permissions, data policies, versioning, review, audit, model routing, and clear responsibility.

### The enduring asset is institutional state

Models will change. Data vendors will change. A fund’s approved thesis, evidence chain, decision history, and firm-specific evaluation data can persist and compound.

Delphi is positioned above models and alongside existing systems: not replacing every tool, but governing how their outputs become institutional decisions.

---

## 5. Target customer

The initial ICP is:

- fundamental long/short or concentrated long-only;
- 5–30 investment and research professionals;
- active earnings and catalyst workflow;
- real positions and stable coverage;
- existing Excel, professional data, collaboration, and research tools;
- no mature internal AI platform team;
- CIO, PM, or Head of Research sponsor.

We are deliberately not targeting high-frequency or purely systematic strategies first, and we do not plan to make mega-funds the early revenue forecast. Large institutions can be valuable design and security advisors without dictating the first product.

---

## 6. Market

**Planning model — not a census or booked pipeline.**

A bottom-up internal model estimates:

- **U.S. early beachhead:** approximately 500–1,200 strict-fit firms;
- **current global serviceable market:** approximately 1,300–3,500 firms;
- **long-term multi-workflow market:** approximately 3,000–6,000 firms.

Using planning ACVs of roughly $60k–$120k for an initial workflow and $100k–$250k for multi-workflow / private deployments implies:

- U.S. beachhead revenue pool: approximately $30m–$120m ARR;
- current global SAM: approximately $76m–$422m ARR;
- long-term platform TAM: approximately $300m–$1.5b ARR.

The largest uncertainty is not the number of asset managers. It is the proportion with a formal thesis-driven workflow, adequate budget, insufficient internal platform capacity, and willingness to adopt governed state change. Delphi should validate this through 50–100 named accounts and 3–5 highly similar design partners.

---

## 7. Competition

Relevant categories include:

- financial intelligence and search platforms such as AlphaSense;
- institutional AI and workflow platforms such as Hebbia;
- finance-specific agent platforms such as Rogo and Finster;
- internal builds using general-purpose models and orchestration frameworks;
- manual spreadsheets, shared drives, and messaging workflows.

These products increasingly offer private-data integration, financial context, agents, citations, workflow automation, and enterprise security. Delphi therefore does not claim that “multi-agent,” “financial RAG,” or “cited reports” are unique.

### Delphi’s product center is different

> **Others help finance teams find and generate information. Delphi governs how a fund’s approved view changes over time.**

The differentiation is the combination of:

- canonical investment state;
- proposal-before-mutation;
- human authorization;
- point-in-time decision history;
- firm-specific materiality and evaluation;
- customer-owned deployment boundary;
- workflow embedding into formal investment review.

---

## 8. Business model

Planned revenue streams:

- annual platform license;
- Workflow Packs;
- implementation;
- private-deployment premium;
- support / SLA;
- ongoing evaluation and upgrades.

Customers can contract directly with model, data, and cloud providers. Delphi does not need to depend on token resale.

### Planning price ranges

| Offering | Planning assumption |
|---|---:|
| 4–8 week paid shadow pilot | $8k–$25k |
| One team / one workflow | $40k–$100k ARR |
| Multiple teams / workflows | $100k–$250k+ ARR |
| Customer VPC / sovereign deployment | additional license and implementation |

These are hypotheses to validate, not current contracted prices.

---

## 9. Go-to-market

### Founder-led sequence

1. **Reverse Demo** — observe the customer’s most recent real earnings workflow;
2. **One-Event Proof** — run the same event against the customer’s thesis;
3. **Paid shadow pilot** — 10–20 names, 1–2 event types, read-only state;
4. **Controlled production** — authorized write-back and Decision Ledger;
5. **Land and expand** — Catalyst Monitor, Pre-Earnings, Thesis Integrity Review, and Portfolio Impact.

### Productization rule

```text
80% standard product
15% declarative configuration
5% customer-specific integration
```

The first 3–5 design partners should use the same workflow pack, evaluation framework, and trust package. Delphi should not become a custom research consultancy.

---

## 10. Current status

### Existing technical evidence

A prior R&D / thesis prototype explored:

- typed ontology and separate runtime graph;
- fixed, bounded multi-agent execution;
- validated graph-patch proposals;
- explicit runtime events;
- structured reports;
- graceful degradation;
- deterministic fixture-backed runs;
- a dual-pane observable frontend.

That work is useful architectural evidence, but it should not be presented as production readiness. The strongest successful validation was fixture-backed, and a live provider execution path remained an open engineering issue.

### Current build objective

Rebuild the product surface around the narrower commercial loop:

```text
Earnings event
→ Thesis Delta
→ human approval
→ Decision Ledger
```

The public prototype will be deterministic by default, with optional live-model execution behind the same adapter.

### Commercial status

`[FOUNDER INPUT REQUIRED: interviews, design partners, LOIs, pilots, customers, revenue, incorporation, full-time team, funding]`

No traction should be inferred or overstated.

---

## 11. Six-month milestones

1. Launch a stable interactive prototype and public website;
2. complete 15–25 structured customer-discovery conversations;
3. identify 3–5 design-partner candidates in a narrow ICP;
4. complete at least two One-Event Proofs using customer workflow artifacts;
5. convert at least one into a paid shadow pilot;
6. measure citation validity, numeric accuracy, review time, materiality precision, and action rate;
7. implement a Postgres-backed Decision Ledger and approved write-back;
8. produce a standard Trust Package and customer-owned Data Plane design;
9. validate pricing and procurement path;
10. decide whether Earnings-to-Thesis supports repeatable expansion.

---

## 12. Moat formation

### Layer 1 — Deployment assets

Validated workflow packs, connectors, policies, schemas, materiality rubrics, evaluation suites, and security artifacts.

### Layer 2 — Institutional state

Years of approved thesis, evidence, decisions, outcomes, and review history inside the customer’s controlled environment.

### Layer 3 — Firm-specific evaluation

Knowledge of which models, skills, alerts, and communication patterns are reliable for that particular investment process.

### Layer 4 — Workflow embedding and trust

Delphi becomes part of earnings review, PM meetings, thesis maintenance, and postmortems.

The moat is not access to a single model. It is the governed operating context that makes models useful and safe.

---

## 13. Key risks

- financial AI platforms expand into formal state management;
- customer needs fragment and create consulting economics;
- limited access to real historical thesis data slows evaluation;
- analysts perceive the product as monitoring or replacement;
- low materiality precision destroys trust;
- security review slows sales;
- private deployment costs overwhelm early ACV;
- startup reliability concerns block production adoption.

Mitigation starts with a narrow ICP, one repeatable workflow, synthetic and historical replay, human approval, customer-owned deployment, open export, and explicit kill criteria.

---

## 14. Why Endless Frontier Labs

Delphi fits the Digital Tech track because its competitive advantage is an innovative software and AI control architecture, not merely execution of a conventional SaaS idea.

EFL would be most valuable in four areas:

1. refining the first ICP and purchasing path;
2. converting technical architecture into measurable commercial milestones;
3. building a repeatable design-partner and pilot motion;
4. strengthening fundraising, pricing, enterprise procurement, and customer trust materials.

The company can bring a clear technical prototype and a narrow workflow hypothesis; EFL can provide the performance-driven mentorship and network needed to test commercialization rigorously.

---

## 15. Immediate asks

- introductions to fundamental public-markets investors and emerging managers;
- advisors with buy-side research operations, CTO/CISO, and compliance experience;
- feedback on pilot packaging and annual pricing;
- help recruiting design partners;
- critique of the technical moat and procurement narrative;
- early-stage fundraising guidance after workflow validation.

---

## 16. Long-term vision

Every material piece of evidence, every approved change in belief, every responsible decision, and every observed outcome should enter one traceable institutional memory chain.

If Delphi succeeds, it becomes the governed decision layer between models, data terminals, Excel, collaboration tools, research repositories, and portfolio systems—allowing investment firms to adopt stronger AI without surrendering control of their process or history.

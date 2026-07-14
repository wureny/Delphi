# Endless Frontier Labs 2026–27 — Delphi Application Answer Bank

**Status:** draft answer bank, not ready to submit until all founder facts are completed  
**Track:** Digital Tech  
**Application deadline:** July 31, 2026 at 11:59 PM ET  
**Rule:** replace every `[FOUNDER INPUT REQUIRED]` and verify every numeric claim.

---

## 0. Eligibility gates

EFL currently requires a formally incorporated company and at least one full-time member driving the business.

- Legal entity name: `[FOUNDER INPUT REQUIRED]`
- State / country of incorporation: `[FOUNDER INPUT REQUIRED]`
- Incorporation date: `[FOUNDER INPUT REQUIRED]`
- At least one full-time member: `[FOUNDER INPUT REQUIRED — YES/NO, NAME, ROLE]`
- CEO able to attend all five Meeting Days: `[FOUNDER INPUT REQUIRED]`

Do not submit until these are accurate.

---

# Section 1 — CEO contact and location

## CEO name

`[FOUNDER INPUT REQUIRED]`

## CEO title

`[FOUNDER INPUT REQUIRED]`

## Email / phone

`[FOUNDER INPUT REQUIRED]`

## Current city and country

`[FOUNDER INPUT REQUIRED]`

## Company headquarters

`[FOUNDER INPUT REQUIRED]`

---

# Section 2 — Company

## Company name

**Delphi**  
`[VERIFY LEGAL / DBA NAME]`

## Company website

`[FOUNDER INPUT REQUIRED — insert public URL]`

## Pitch deck

`[FOUNDER INPUT REQUIRED — insert shareable deck URL]`

## Company description — approximately 100 words

Delphi is an AI-native decision operating system for fundamental investment teams. It connects research documents, earnings data, financial models, and the team’s approved thesis, then identifies what changed, which assumptions are affected, and what requires review. Rather than producing another one-off report, Delphi creates a cited Thesis Delta Proposal that an analyst can accept, edit, reject, or escalate. Approved changes enter a point-in-time Decision Ledger, preserving evidence, responsibility, and history. The initial product, Earnings-to-Thesis, helps small and mid-sized funds turn post-earnings analysis into a faster, more consistent, and auditable workflow while keeping humans in control.

## Long-term vision

We want every material piece of evidence, change in investment belief, approval, decision, and outcome to enter one traceable institutional memory chain. Delphi’s long-term vision is to become the governed decision layer between AI models, financial data, Excel models, research repositories, collaboration tools, and portfolio systems. Models will continue to improve and change; the fund’s approved state, permissions, workflow, and decision history should persist. By separating flexible AI reasoning from validated, human-authorized state change, Delphi can help investment institutions adopt more capable models without losing control, auditability, or institutional memory.

## Track

**Digital Tech**

### Why this track

Delphi’s competitive advantage is based on advances in software, data systems, AI orchestration, typed domain modeling, policy-controlled tools, and human-governed state transitions. The company is commercializing a technical architecture for trusted institutional decision workflows rather than applying a conventional software workflow with minimal technical differentiation.

## Is the company formally incorporated?

`[FOUNDER INPUT REQUIRED]`

## Founding date

`[FOUNDER INPUT REQUIRED]`

## Number of full-time employees

`[FOUNDER INPUT REQUIRED]`

## Number of part-time employees / contractors

`[FOUNDER INPUT REQUIRED]`

---

# Section 3 — Product and technology

## What pain point are you solving, and how does your solution address it?

Fundamental investment teams already have data terminals, Excel models, research repositories, chat tools, and AI assistants. The gap is maintaining what the team officially believes as new evidence arrives. After earnings, analysts still reconcile facts against forecasts, compare management commentary with the current thesis, update fragmented trackers, brief the PM, and preserve a defensible record of what changed. Existing AI can generate summaries, but a summary is not an approved institutional state.

Delphi compares each material event against the current approved thesis, creates cited and structured change proposals, routes them to the correct human reviewer, and records only authorized changes in a point-in-time Decision Ledger. It preserves evidence, uncertainty, responsibility, and model/workflow versions while keeping final judgment with the investment team.

## Describe the product’s technical core.

Delphi is a governed state-transition system with bounded model participation. Stable domain objects—such as thesis pillars, assumptions, forecasts, risks, claims, evidence, decisions, and reviews—have identity and version. Run-specific objects—tasks, tool calls, findings, proposals, and degradation events—are kept separate. Agents receive task-scoped data and tools, produce typed findings, and cannot directly modify approved state. Deterministic validators check schema, evidence, numbers, policy, references, and authorization. A state-transition gateway applies a change only after an authorized human review, then records before/after state and complete lineage in the Decision Ledger.

## What tests, prototypes, or pilots have you completed? If none, what is the test plan?

### Draft answer — use only after verifying the current repository

A prior R&D prototype demonstrated a structurally closed, fixture-backed single-stock research workflow with typed ontology objects, a bounded four-agent runtime, explicit task and event records, validated graph-patch proposals, a structured report, and graceful degradation when sources or agents failed. This work supports the architectural feasibility of explicit research objects and controlled state change, but it was not a production customer system; the strongest validation was deterministic fixture execution and a live provider path remained incomplete.

We are now rebuilding the product around a narrower commercial workflow: earnings event → cited Thesis Delta Proposal → human approval → Decision Ledger. The next test sequence is: deterministic interactive demo, historical replay cases, 15–25 customer-discovery interviews, two One-Event Proofs with design-partner candidates, and a 4–8 week paid shadow pilot.

`[VERIFY WHICH TECHNICAL RESULTS CAN BE DEMONSTRATED TODAY]`

## What are the biggest technical or commercial obstacles over the next six months?

1. Achieving high materiality precision so PMs see only changes that deserve attention;
2. obtaining realistic point-in-time thesis and forecast data for evaluation without creating security or licensing problems;
3. validating citations, numeric reconciliation, and degraded-mode behavior across heterogeneous sources;
4. converting customer-specific research language into configuration rather than bespoke code;
5. proving that a customer will pay for approved state change and decision history, not only search and summarization;
6. building a credible security and customer-owned deployment path early enough for institutional procurement;
7. establishing a repeatable design-partner and pilot motion within a narrow ICP.

## Who owns the technology?

`[FOUNDER INPUT REQUIRED: legal ownership of code, thesis work, prior university work, contributor assignments, open-source dependencies, contractor IP assignment]`

Suggested structure after legal verification:

> The company owns all newly developed Delphi product code and workflow IP through written founder and contributor assignments. The system uses standard open-source components under their respective licenses, while Delphi’s domain schemas, workflow packs, validators, evaluation suites, materiality policies, deployment automation, and product design are proprietary. Any pre-company or university-developed work has been reviewed and assigned or cleanly reimplemented as required.

Do not use this until verified.

## How do you protect the IP?

Delphi’s defensibility is expected to come primarily from trade secrets, copyright, contractual controls, customer-specific data boundaries, and accumulated workflow/evaluation assets rather than dependence on a single patent. Proprietary assets include the institutional investment-state model, governed transition interfaces, workflow packs, validators, materiality rubrics, point-in-time evaluation datasets, deployment automation, and implementation playbooks. The architecture is designed so customer proprietary thesis and decision data remain under customer control, while Delphi retains its reusable software and workflow IP. We will evaluate patentability with counsel if a specific technical method is both novel and strategically worth disclosing.

`[FOUNDER INPUT REQUIRED: any filed or planned patents, trademarks, domain ownership]`

---

# Section 4 — Market

## What is the business model?

Delphi plans to sell B2B annual software licenses to investment firms, beginning with a paid 4–8 week shadow pilot. Revenue can include the platform license, Workflow Packs, implementation, private-deployment premium, support/SLA, and ongoing evaluation and upgrades. Customers can contract directly with their model, data, and cloud providers; Delphi does not need to depend on token resale.

Planning ranges—not current contracted prices—are $8k–$25k for a paid pilot, $40k–$100k ARR for one team and one workflow, and $100k–$250k+ ARR for multiple workflows or private deployments. We will validate willingness to pay and procurement friction through design partners and the first pilot.

## Who are the direct competitors, and why?

Relevant competitors and substitutes include:

- AlphaSense, for financial content, AI search, deep research, and integrated research workflows;
- Hebbia, for institutional AI, private-data integration, and automated finance workflows;
- Rogo, for finance-specific agents embedded in institutional systems;
- Finster, for finance-specific agents, proprietary data, traceable outputs, and workflow automation;
- internal builds using general-purpose models and orchestration frameworks;
- spreadsheets, shared drives, and messaging processes that remain the operational status quo.

These companies validate demand for finance-specific AI, but they also mean that generic search, multi-agent orchestration, citations, and report generation are not sufficient differentiation.

## What is Delphi’s competitive advantage?

Delphi is centered on governed institutional state rather than discovery or artifact generation. It maintains the fund’s approved thesis, forecasts, risks, evidence, and decision history as versioned objects. Models can propose changes, but deterministic validators and authorized humans control whether formal state changes. Each approved transition is recorded point-in-time with evidence, responsibility, workflow, skill, and model versions. Over time, Delphi can learn firm-specific materiality and reliability inside a customer-owned trust boundary. The intended result is not another answer, but a durable and auditable investment decision process.

## Who are the target customers?

The initial customer is a fundamental long/short or concentrated long-only investment firm with approximately 5–30 investment and research professionals, active earnings and catalyst workflows, existing Excel and professional data tools, real positions and stable coverage, but no mature internal AI platform team. The economic buyer is typically the CIO, PM, or Head of Research; important technical and governance stakeholders include the COO, CTO/CISO, and CCO/legal team.

We will exclude purely systematic strategies and avoid treating mega-funds as the first production revenue target.

## How large is the market?

### Bottom-up planning answer

Our internal bottom-up model estimates a U.S. early beachhead of roughly 500–1,200 strict-fit firms and a current global serviceable market of roughly 1,300–3,500 firms. At planning ACVs of approximately $60k–$120k for an initial workflow, this implies a current global revenue pool of approximately $76m–$422m ARR. A longer-term multi-workflow platform serving approximately 3,000–6,000 firms at $100k–$250k ACV would imply approximately $300m–$1.5b ARR.

These ranges are explicitly assumptions, not a registry census. The main unknown is the percentage of firms with a thesis-driven workflow, suitable team size, insufficient internal platform capacity, and willingness to purchase. The immediate validation plan is a 50–100 named-account universe and 3–5 similar design partners.

## Is regulatory approval required?

The initial Delphi product is decision-support and research workflow software. It does not execute trades, manage assets, provide custody, or make final investment decisions. We do not currently expect a product-specific regulatory approval before pilot use, but customers will impose legal, compliance, records-retention, data-licensing, model-governance, cybersecurity, and potentially MNPI-related requirements. We will obtain counsel on the exact product boundaries, marketing language, adviser/vendor implications, and customer obligations before production deployment.

`[LEGAL REVIEW REQUIRED — do not present as legal advice]`

---

# Section 5 — Traction

## Describe commercial progress.

`[FOUNDER INPUT REQUIRED]`

Use one of the following honest patterns.

### If only interviews exist

> We are pre-revenue and beginning structured customer discovery. We have completed `[N]` conversations with `[roles / institution types]`. The strongest repeated problem is `[validated problem]`, while `[disconfirmed assumption]` has changed our product scope. We are recruiting 3–5 similar design-partner candidates for a One-Event Proof and paid shadow pilot.

### If design-partner interest exists

> We are pre-revenue. `[N]` firms have agreed to continue design-partner discussions / provide a historical workflow / evaluate a One-Event Proof. These are not contracted customers. Our next milestone is to convert one into a paid 4–8 week shadow pilot.

### If a pilot or revenue exists

State contract status, amount, start date, scope, and whether revenue is booked or collected. Do not combine unpaid interest with customers.

## Number of customers

`[FOUNDER INPUT REQUIRED]`

## Revenue to date / ARR

`[FOUNDER INPUT REQUIRED]`

## Pilots, LOIs, or design partners

`[FOUNDER INPUT REQUIRED]`

---

# Section 6 — Funding

## Current funding stage

`[FOUNDER INPUT REQUIRED: bootstrapped / pre-seed / seed]`

## External investors

`[FOUNDER INPUT REQUIRED]`

## Highlight investors

`[FOUNDER INPUT REQUIRED]`

## Currently fundraising?

`[FOUNDER INPUT REQUIRED]`

Suggested answer if not yet raising:

> We are currently focused on completing the interactive prototype, validating the first workflow with design partners, and defining the milestones for a pre-seed round. We expect to make a formal fundraising decision after initial customer evidence.

## Non-equity grants, awards, or programs

`[FOUNDER INPUT REQUIRED]`

## Monthly burn and runway

`[FOUNDER INPUT REQUIRED — exact, current, and internally consistent]`

---

# Section 7 — Team

## Founders and C-level team

`[FOUNDER INPUT REQUIRED: name, title, full-time status, location, LinkedIn, education, prior work]`

## Why is this team qualified?

Draft structure:

> The team combines financial-market research, hands-on AI systems development, and direct experience translating ambiguous investment questions into structured technical workflows. `[Founder]` built an earlier Delphi R&D prototype around typed financial research objects, bounded multi-agent execution, evidence lineage, and observable state transitions. The company’s advantage is not only domain familiarity or model usage, but the ability to design the contracts, evaluation, product surface, and trust boundaries required to turn AI output into an institutional workflow. `[Add cofounder / advisor evidence and concrete achievements.]`

Verify every claim.

## Prior startup experience

`[FOUNDER INPUT REQUIRED]`

## Technical team coverage

`[FOUNDER INPUT REQUIRED: who can build product, backend, AI, infra, and security]`

## Gaps in the team

Honest draft:

> Near-term gaps include enterprise go-to-market, buy-side procurement, security/compliance operations, and potentially a senior product or infrastructure cofounder / early hire, depending on the current team composition. EFL’s mentor and MBA network would be directly relevant to closing these gaps.

Adjust after team facts are known.

---

# Section 8 — Program fit and concluding questions

## Prior EFL, NYU, or accelerator affiliation

`[FOUNDER INPUT REQUIRED]`

## What assistance would be most valuable from EFL?

EFL would be most valuable in helping Delphi convert a technically coherent prototype into a commercially disciplined company. Our priorities are:

1. sharpening the first customer segment and economic buyer;
2. designing customer-discovery and pilot milestones that can disprove weak assumptions quickly;
3. reaching fundamental investment teams and buy-side operating leaders through trusted introductions;
4. validating pricing, procurement, and private-deployment requirements;
5. refining the fundraising narrative around a defensible technical core rather than generic AI;
6. building a repeatable path from One-Event Proof to paid shadow pilot and controlled production.

We can bring a narrow workflow hypothesis, a working interactive prototype, and clear technical architecture; we want EFL’s performance-driven mentorship to help prove commercialization.

## How did you hear about EFL?

`[FOUNDER INPUT REQUIRED]`

## Anything else the committee should know?

Delphi is intentionally not trying to prove that an AI model can produce a better stock recommendation. The company is addressing a systems problem: how an institution can adopt stronger models while preserving stable research objects, source lineage, permissions, human responsibility, and point-in-time decision history. The initial Earnings-to-Thesis workflow is narrow enough to test, but the same architecture can support catalyst monitoring, thesis-integrity review, management-meeting workflows, portfolio impact, and decision postmortems. We believe the durable opportunity is not another AI answer—it is the governed institutional state that makes AI safe and useful over time.

---

# Final submission checklist

- [ ] Every founder and company fact is completed;
- [ ] incorporation and full-time eligibility confirmed;
- [ ] website and deck URLs are public and tested;
- [ ] product description matches website hero;
- [ ] prototype can be reset and replayed;
- [ ] traction language distinguishes interviews, interest, pilots, customers, and revenue;
- [ ] market figures are labeled as bottom-up assumptions;
- [ ] prior prototype claims are reproducible;
- [ ] technology ownership is legally verified;
- [ ] regulatory answer reviewed by counsel;
- [ ] monthly burn and runway reconcile;
- [ ] all team members approve their bios;
- [ ] no statement promises alpha, automation of investment judgment, or unimplemented security certification.

# Design Notes — Living Thesis MVP

Design artefact for Delphi. Author: Design Lead. Status: prototype for Codex hand-off.
This documents *intent and trade-offs*, not implementation. Read alongside
`interaction-contract.md`, `state-matrix.md`, `component-inventory.md`, `codex-handoff.md`.

---

## 1. What this MVP is for

Delphi's wedge is **judgment maintenance**, not information retrieval. The product
exists because investors lose the *reasoning* behind a position: theses drift,
evidence scatters, rationales are forgotten. The MVP must make one loop fast and
trustworthy:

> See the state of my beliefs → triage new evidence against them → understand what
> changed → record the decision I make and why.

Everything outside that loop is deferred. We are explicitly **not** building a chat
assistant, a screener, a price model, or a data terminal (see `non-goals.md`).

### Core objects (the only vocabulary the UI uses)
`Asset → Thesis → Assumption`, with `Evidence` / `Counter-evidence` attaching to a
thesis or assumption, `Risk` and `Catalyst` as context, and a `Decision` appended to
an auditable `Decision trace`. `Conviction` and `Freshness` are thesis-level signals.
No "ontology", "graph", "node/edge", or "chain-of-thought" language appears anywhere
on screen — the graph is plumbing, not a feature.

### The most important user scenarios (ranked)
1. **Monday triage.** New evidence arrived over the weekend; which of my theses does
   it touch, and does it support or contradict them? → *Evidence Inbox*.
2. **"What changed since I last looked?"** before an IC meeting or LP update →
   *What Changed*.
3. **An assumption broke.** Counter-evidence falsified something I was relying on; I
   need to see it loudly and decide → *Counter-evidence surfacing + Decision*.
4. **"Why did I do that?"** months later, for a post-mortem or LP → *Decision trace*.

---

## 2. The four screens and why they exist

| Screen | User goal | Primary action | Why it's in the MVP |
|---|---|---|---|
| **Thesis Dashboard** | "What's the state of my beliefs right now?" | Scan conviction, freshness, broken assumptions; jump to a thesis | UX principle #1: home is thesis state, never a blank prompt |
| **Evidence Inbox** | "Triage what just arrived against my theses" | Accept / correct / dismiss each item | The daily repeated loop; where AI proposes and human disposes |
| **Asset / Thesis Page** | "Work one belief in depth" | Inspect assumptions + evidence map, record a decision | The workbench; holds bull/bear, evidence map, decision trace |
| **What Changed** | "What moved since last review?" | Read diff, record a decision | The product's signature question; change mapped to assumptions |

### Dashboard — design decisions
- **Conviction meter + band chip**, not a number alone. The band (high/med/low) is the
  glanceable signal; the 0–100 is the precision.
- **Freshness is a timestamp-derived state**, never "recently". Anything > 21 days shows
  a stale banner. Datadog in the fixtures is deliberately 38 days stale to demonstrate it.
- **A counter-evidence attention strip** sits above the grid when new contradicting
  items exist. Counter-evidence gets a *dedicated path to the top of the screen* — this
  is the structural expression of "counter-evidence is first-class".
- **Watchlist assets without a thesis** render as dashed "No thesis yet" cards. This is
  the partial-data state made visible and actionable, not hidden.

### Evidence Inbox — design decisions
- Each item is **color-coded by impact** on the left border: teal supports, red
  contradicts (dashed amber for unclear). The eye finds counter-evidence without reading.
- Every item shows **who classified it** (`◇ AI classified` vs `✓ You confirmed`). The
  AI's classification is always presented as a *proposal* — the buttons are "Accept &
  attach", "Correct", "Dismiss as noise". The human disposes.
- **"Why this classification"** rationale is always shown — a short, grounded reason, not
  the model's reasoning trace. It cites the source quality and the assumption it maps to.
- **Grounding is enforced in the layout**: each item shows either a citation chip
  (`↗ source`) or an explicit `uncertain — no firm source` flag. There is no third
  option. `ev_4` (an influencer price-target thread) is the worked example: low quality,
  no citation → flagged uncertain, attached to no assumption.
- The **"Needs a human"** filter collects low-confidence + uncertain items so triage of
  the ambiguous tail is a deliberate, batched act.

### Asset / Thesis Page — design decisions
- **Bull and bear are equal-weight, side by side.** The bear case is never a footnote.
- **Assumptions carry a status** (holding / weakening / broken / uncertain) and a
  *falsifier note*. "Uncertain" is a first-class status — we do not force a binary when
  the data is genuinely contested (retail foot-traffic quality, `a_retl_3`).
- The **evidence map splits supporting vs. counter-evidence into two columns** with
  equal visual weight. Counter-evidence cannot be collapsed or summarised away.
- The **decision trace is a vertical ledger**: decision, conviction delta, the user's
  rationale, sources (or an explicit "judgment call — no source"), follow-up, and open
  questions. No model reasoning appears.

### What Changed — design decisions
- The summary is **per-thesis and bounded by the user's last-review timestamp**, not a
  rolling news feed. Each summary line links to the evidence that justifies it.
- **Assumption diffs** render as `Holding → Weakening` chips — the literal "what changed".
- The **conviction prompt is a prompt, never an automatic change.** Delphi says "consider
  whether 54 still reflects this" and offers a "Record a decision" button. It never moves
  the number itself. The `down` styling appears only when a *critical* assumption broke.
- The stale-thesis case (Datadog) produces an honest "no new evidence in 38 days — overdue"
  line rather than inventing change.

---

## 3. Key trade-offs

- **No chat box in the MVP.** Tempting, but it pulls the product toward "generic
  assistant" and buries thesis state. Deferred. If added later it is a *secondary* mode
  invoked from a thesis, scoped to that thesis's evidence.
- **AI never writes a decision rationale.** We could auto-draft it. We don't: the rationale
  is the audit-critical human artefact, and an auto-draft invites rubber-stamping. The
  decision modal *requires* a typed rationale and refuses to save without one.
- **AI never moves conviction or status automatically.** It proposes (inbox) and prompts
  (what-changed). Every state change to a thesis is a recorded human act. This keeps the
  decision trace honest and avoids "the model downgraded my thesis" liability.
- **Corrections are cheap and always available**, even on already-accepted items. The cost
  of a wrong AI classification must be one click to fix, and the fix is logged.
- **One conviction scale (0–100 + band).** Resisted multi-dimensional conviction for the
  MVP; it adds cognitive load without clear payoff at this stage.
- **Source quality is shown but not used to auto-suppress.** A low-quality source lowers
  confidence and may flag uncertainty, but Delphi never silently drops an item — the user
  dismisses noise explicitly. This preserves "counter-evidence is never hidden" even when
  the counter-evidence comes from a weak source.

---

## 4. Follow-up risks / open questions for Codex & product

1. **Classification quality is the whole game.** If AI mis-maps evidence to assumptions
   frequently, the inbox becomes noise. Eval coverage (see `codex-handoff.md`) is
   non-negotiable before this ships.
2. **What-Changed baseline semantics.** "Since last review" must be defined precisely:
   is it the last `Decision`, the last explicit "mark reviewed", or last page-open? The
   prototype uses an explicit `lastReviewed` timestamp; production must pick one and make
   it visible.
3. **Counter-evidence from low-quality sources** risks alarm fatigue. We surface it but
   tag source quality; needs real-world tuning so the attention strip stays meaningful.
4. **Stale threshold (21d) is a placeholder.** Should likely vary by thesis cadence — an
   event-driven semiconductor thesis may need faster review than a slow-compounder software thesis.
   Make it configurable per thesis.
5. **Decision trace immutability.** For audit/LP credibility, recorded decisions should be
   append-only and timestamped server-side; corrections add a new entry rather than
   editing history. Prototype doesn't enforce this — production must.
6. **No multi-user / attribution model yet.** `actor` is a single user. Funds need
   per-seat attribution on the trace; deferred but the field exists.

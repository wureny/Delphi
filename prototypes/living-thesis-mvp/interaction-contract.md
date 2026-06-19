# Interaction Contract — Living Thesis MVP

The behavioural contract for each screen: user goals, the objects on screen, the
interactions and their guarantees, and the AI behaviour each surface depends on.
Codex should treat the **guarantees** (marked ⛓) as invariants — they encode the
non-negotiable product rules from `CLAUDE.md`.

Global invariants (apply everywhere):
- ⛓ Every AI-derived, investment-relevant statement shows a **citation** or an explicit
  **uncertainty flag**. There is no unsourced confident claim.
- ⛓ No buy/sell recommendation or price target is ever generated. Influencer price-target
  content is classified `unclear`, attached to nothing, and flagged uncertain.
- ⛓ Counter-evidence is never hidden, downranked, or merged into a summary without a
  visible counter-evidence marker.
- ⛓ Any AI classification is a *proposal*; a thesis only changes through a recorded human
  action. The AI never edits conviction, assumption status, or the decision trace.
- ⛓ No model chain-of-thought is shown. "Why this classification" is a short grounded
  reason citing source + assumption, not reasoning steps.

---

## Screen 1 — Thesis Dashboard

**User goal:** assess the state of all beliefs in one glance and enter the one that needs work.

**Objects shown:** `Thesis` (title, conviction + band, freshness, broken/weakening
assumption counts, unresolved count, pending-change count), counter-evidence summary,
watchlist `Asset`s without a thesis.

**Interactions**
- Click a thesis card → Asset/Thesis page for that thesis.
- Click the counter-evidence strip "Review" → Evidence Inbox filtered to `contradicts`.
- Click a "No thesis yet" card "+ Start thesis" → thesis creation (stubbed in prototype).
- Sidebar nav switches screens; the inbox nav item shows a live unread count.

**Guarantees**
- ⛓ A thesis older than the stale threshold renders a stale banner and the freshness label
  turns amber — conclusions are explicitly marked "treat with caution".
- ⛓ If any new counter-evidence exists, it is promoted to a strip above the grid; it cannot
  be reached only by scrolling.

**AI behaviour relied on:** counts of weakening/broken assumptions come from the
classification + assumption-status engine. The dashboard renders them; it does not compute
conviction.

---

## Screen 2 — Evidence Inbox

**User goal:** triage newly-arrived information against existing theses, quickly and correctly.

**Objects shown:** `Evidence` (headline, excerpt, source + quality, received time) and its
proposed `classification` (impact, asset, thesis, assumption, confidence, source=ai|user,
rationale, citation **or** uncertainty flag).

**Interactions & flows**
1. **Filter** by New / Counter-evidence / Needs a human / Accepted / All.
2. **Accept & attach** → `status: accepted`; item appears in the thesis's evidence map.
3. **Correct classification** → opens the correction modal (impact, thesis, assumption,
   confidence, optional note). On save: `classification.source = "user"`, the override is
   recorded, and (production) the signal feeds classifier improvement.
4. **Dismiss as noise** → `status: dismissed`; retained in history, attached to nothing.

**Guarantees**
- ⛓ Impact is color + label coded; counter-evidence is visually distinct on arrival.
- ⛓ Every item shows citation-or-uncertainty before any action is possible.
- ⛓ Correction is available even after acceptance — a wrong classification is always one
  click from fixed, and the fix is logged.
- ⛓ The AI's classification is labelled as AI (`◇`) until a human confirms (`✓`).

**AI behaviour relied on (see eval cases in `codex-handoff.md`):**
- *Evidence classification* — map each item to {asset, thesis, assumption} and an impact
  ∈ {supports, contradicts, neutral, unclear} with a confidence and a one-line grounded
  rationale.
- *Counter-evidence detection* — recognise that an item falsifies/weakens an assumption and
  mark `contradicts` (not "neutral" to keep things calm).
- *Relevance gating* — items with no credible link to the universe get `asset = null`,
  `impact = unclear`, surfaced for the user to confirm/dismiss, never force-attached.
- *Grounding/uncertainty* — attach a citation when source-backed; otherwise set
  `uncertain = true` and withhold an assumption mapping.

---

## Screen 3 — Asset / Thesis Page

**User goal:** work a single belief in depth and record a decision.

**Objects shown:** `Thesis` summary, bull/bear, `Assumption`s (status + falsifier note),
the split `Evidence map` (supporting | counter-evidence), `Risk`s, `Catalyst`s, and the
`Decision trace`.

**Interactions & flows**
- **What changed?** button → What Changed screen.
- **Record decision** → decision modal (decision type, new conviction slider, required
  rationale, optional follow-up). On save: appends a `Decision` to the trace, updates
  conviction + band, resets freshness, clears pending-change count.
- **Revise** an assumption → assumption editor (stubbed); a status change is recorded to
  the trace.

**Guarantees**
- ⛓ Supporting and counter-evidence columns have equal visual weight; counter-evidence is
  never collapsed.
- ⛓ The decision modal **refuses to save without a typed rationale** (the field errors and
  a toast explains why). The model never writes the rationale.
- ⛓ Each trace entry shows sources or an explicit "judgment call — no source"; never model
  reasoning.
- ⛓ A stale thesis shows a banner here too.

**AI behaviour relied on:** the evidence map ordering/grouping comes from classification;
the page itself records the human's decision verbatim.

---

## Screen 4 — What Changed

**User goal:** understand what materially moved since the last review of each thesis.

**Objects shown:** per-thesis change summary (each line linked to evidence), assumption
status diffs (`from → to`), and a conviction *prompt*.

**Interactions & flows**
- Read the summary; click a citation chip to inspect the source evidence.
- **Record a decision** (same modal as Screen 3) directly from a change card.
- **Open thesis** → Asset/Thesis page.

**Guarantees**
- ⛓ Change is scoped to "since `lastReviewed`", not a generic news digest.
- ⛓ Every summary line carries a citation, or — when there is genuinely no new evidence —
  an honest "no new evidence / overdue for review" marker. The engine does not fabricate change.
- ⛓ The conviction prompt never alters conviction; it offers to open the decision flow.
- ⛓ The `down`-styled prompt appears only when a *critical* assumption broke or weakened.

**AI behaviour relied on:**
- *Change summarisation* — diff the thesis state against the last-review baseline and
  produce a short, grounded summary mapped to assumptions; surface strengthened and
  weakened items symmetrically.
- *Conviction prompting* — suggest *direction of attention* (down / review) with rationale
  and an `uncertain` flag when the net is ambiguous; never a numeric target.

---

## Cross-screen flow: the daily loop
```
Dashboard (counter-evidence strip)  →  Inbox (accept / correct / dismiss)
        ↓                                        ↓
   open a thesis  ←──────────────  attached evidence lands in evidence map
        ↓
   "What changed?"  →  read diff  →  Record decision (rationale required)
        ↓
   Decision trace updated · conviction set by human · freshness reset
```

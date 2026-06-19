# State Matrix — Living Thesis MVP

Every component must handle empty, loading, error, partial, and stale states explicitly
(UX principle #9). This matrix is the checklist Codex implements against. The prototype
exposes most states via the **"Demo state"** selector in the sidebar
(normal / loading / empty / error) per screen; partial and stale are shown in-line with
fixture data (watchlist-without-thesis card; the 38-day-stale Datadog thesis).

Legend for "shown in prototype": ✅ live · ◐ via Demo-state selector · ▢ described only.

---

## Screen-level states

| Screen | Empty | Loading | Error | Partial | Stale |
|---|---|---|---|---|---|
| **Dashboard** | ◐ "No theses yet" + start CTA | ◐ 3 skeleton cards | ◐ retry block, "nothing changed" reassurance | ✅ watchlist asset → dashed "No thesis yet" card | ✅ stale thesis → amber banner + amber freshness |
| **Evidence Inbox** | ✅ "Inbox zero" / "nothing matches filter" | ◐ skeleton cards | ◐ "source unreachable", triaged items unaffected | ✅ item with `asset=null` → "no asset matched" chip | ▢ evidence older than source horizon flagged in meta |
| **Asset/Thesis** | ✅ empty evidence map; empty decision trace | ▢ skeleton (same pattern) | ▢ per-section retry | ✅ assumption status `uncertain`; "no source — judgment call" on trace | ✅ stale banner at top |
| **What Changed** | ◐ "Nothing material changed" | ◐ skeleton | ◐ "engine timed out", nothing modified | ✅ summary line with "no new evidence" flag | ✅ "no new evidence in 38 days — overdue" line |

---

## Component-level states

### Thesis card
- **Normal:** asset tag, conviction meter+band, assumption-status chips, freshness, pending-changes chip.
- **Stale:** amber freshness + inline stale banner ("review overdue, treat with caution").
- **Up to date:** "up to date" instead of a pending-changes chip.
- **Broken assumption:** red `N broken assumption(s)` chip.
- **No thesis (watchlist):** dashed border, muted "No thesis yet", "+ Start thesis".

### Evidence item
| State | UI |
|---|---|
| New, supports | teal left-border, `Supports` chip, citation chip, Accept/Correct/Dismiss |
| New, counter-evidence | red left-border, `Counter-evidence` chip — visually loud |
| Unclear / low-confidence | dashed amber border, `Unclear` chip, **no assumption attached** |
| Uncertain (no source) | `uncertain — no firm source` flag replaces citation |
| No asset matched | `no asset matched` chip; surfaced for confirm/dismiss, not auto-attached |
| Accepted | `attached` chip, accept button replaced; still correctable |
| Dismissed | filtered out of New; retained under All/history |
| AI vs user classified | `◇ AI classified` until human confirms → `✓ You confirmed` |

### Conviction meter
- high (≥67) teal · medium (34–66) amber · low (≤33) red. Band chip mirrors the color.

### Freshness indicator
- Fresh: grey "reviewed Nd ago". Stale (>21d): amber, ⚠ prefix, triggers banner.

### Assumption row
- `holding` teal · `weakening` amber · `broken` red · `uncertain` dashed amber.
- Critical assumptions carry a red `· CRITICAL` tag and a falsifier note.

### Decision trace entry
- With sources: source citation chips. Without: explicit "No external source — judgment call".
- Always shows actor + timestamp, conviction delta, rationale (human text), follow-up, open questions.
- **Empty trace:** "No decisions recorded… capture why" prompt.

### What-Changed summary line
- Grounded: trailing citation chip linking to evidence.
- No change: trailing `no new evidence` uncertainty flag — engine never fabricates change.

### Conviction prompt (What Changed)
- `review` (neutral): `◇`, accent background, "re-examine" copy.
- `down` (critical break): `▼`, red background. Never changes the number — offers the decision flow.
- `uncertain` net: appends "(uncertain)" to the label.

---

## Modals

### Correction modal
- Pre-filled with the AI's current classification.
- Impact segmented control, thesis select (incl. "none / not relevant"), dependent
  assumption select (disabled until a thesis is chosen), optional human note.
- On save → `source = user`, override logged. Copy makes clear the user is overriding the AI.

### Decision modal
- Decision-type select, conviction slider (live value), **required** rationale, optional follow-up.
- **Validation:** empty rationale → field errors + toast "Delphi will not record a decision
  without one". This is the guardrail that keeps the trace human-authored.

---

## Error-state copy principles
- Always reassure about data safety ("nothing was changed / modified").
- Always offer a retry.
- Never blame the user; name the failing subsystem plainly (ingestion source, change engine).
- Degrade partially where possible: an inbox fetch error must not hide already-triaged evidence.

# Component Inventory — Living Thesis MVP

Components in the prototype, mapped to suggested production components. This is a
*design* inventory: names and responsibilities are the contract; the prototype's vanilla
DOM/CSS implementation is disposable. Tokens live in `styles.css` `:root`.

Columns: **Prototype source** = where it lives now · **Responsibility** · **States**
(see `state-matrix.md`) · **Notes for production**.

---

## Layout & shell
| Component | Prototype source | Responsibility | Notes |
|---|---|---|---|
| `AppShell` | `app.js` `render()` | Sidebar + main grid, routing between 4 views | Replace ad-hoc router with real routing; keep 4 top-level routes |
| `SidebarNav` | `navItems()` | Nav with live unread-evidence count badge | Count must be a live subscription, not a render-time snapshot |
| `DemoStateSelector` | `#simSel` | Forces empty/loading/error per screen | **Discard** — prototype-only QA affordance |

## Primitives (design-system level)
| Component | Tokens / variants | Responsibility |
|---|---|---|
| `Chip` | impact (supports/contradicts/neutral/unclear), status (holding/weakening/broken/uncertain), conviction band, `ai`/`user` source | The workhorse label. Impact + status semantics are product-critical |
| `ImpactDot` | supports/contradicts/neutral/uncertain | Compact impact marker in dense lists |
| `CitationChip` | `.cite` | Renders a source link — the grounding affordance |
| `UncertaintyFlag` | `.uncertain-flag` | The *only* allowed alternative to a citation |
| `ConvictionMeter` | high/medium/low | 0–100 bar + band color |
| `FreshnessLabel` | fresh / stale | Timestamp-derived; flips to stale past threshold |
| `Banner` | stale / partial / error | Inline contextual notice |
| `StateBlock` | empty / error | Centered glyph + title + body + action |
| `Skeleton` | — | Loading placeholder |
| `Button` | primary / subtle / danger / sm | — |
| `Toast` | — | Transient confirmation |
| `SegmentedControl` | — | Used in correction modal (impact) |

## Screen 1 — Thesis Dashboard
| Component | Responsibility | States |
|---|---|---|
| `ThesisGrid` | Responsive grid of thesis cards | empty, loading, error |
| `ThesisCard` | Conviction, freshness, assumption-status counts, pending changes | normal, stale, broken-assumption, up-to-date |
| `CounterEvidenceStrip` | Promote new counter-evidence above the fold → inbox | present only when contradicting items exist |
| `EmptyThesisCard` | Watchlist asset with no thesis | partial-data affordance |

## Screen 2 — Evidence Inbox
| Component | Responsibility | States |
|---|---|---|
| `InboxFilterBar` | New / Counter-evidence / Needs-a-human / Accepted / All | active filter |
| `EvidenceCard` | Headline, excerpt, classification line, rationale, actions | new, accepted, dismissed, supports/contradicts/unclear, ai/user |
| `ClassificationLine` | impact + source + asset + thesis + assumption + confidence + citation/flag | partial (asset/thesis null), uncertain |
| `EvidenceActions` | Accept & attach · Correct · Dismiss | accepted hides accept/dismiss |
| `CorrectionModal` | Override impact/thesis/assumption/confidence + note | dependent assumption select disabled until thesis chosen |

## Screen 3 — Asset / Thesis Page
| Component | Responsibility | States |
|---|---|---|
| `ThesisHeader` | Asset tag, conviction band, freshness, horizon, actions | stale banner |
| `BullBearPanel` | Equal-weight bull vs bear | — |
| `AssumptionList` / `AssumptionRow` | Status chip, falsifier note, critical tag, Revise | holding/weakening/broken/uncertain |
| `EvidenceMap` | Two equal columns: supporting \| counter-evidence | empty, neutral-overflow note |
| `RiskList` / `CatalystList` | Context panels | empty |
| `DecisionTrace` / `TraceEntry` | Auditable ledger timeline | empty, no-source variant |
| `DecisionModal` | Decision type, conviction slider, **required rationale**, follow-up | rationale-required validation |

## Screen 4 — What Changed
| Component | Responsibility | States |
|---|---|---|
| `ChangedCard` | Per-thesis change container scoped to last review | — |
| `ChangeSummaryList` | Grounded summary lines (citation per line) | no-change / no-evidence flag |
| `AssumptionDiffLine` | `from → to` status chips | — |
| `ConvictionPrompt` | Direction-of-attention prompt + decision CTA | review / down / uncertain |

---

## Shared data shapes (suggested, not canonical)
The canonical schema belongs in OpenSpec. Prototype shapes (`fixtures.js`):
`Asset{id,name,ticker,kind}` · `Thesis{…,conviction,convictionBand,lastReviewed,
pendingChanges,assumptions[],risks[],catalysts[]}` · `Assumption{id,text,status,critical,note}` ·
`Evidence{id,status,source{name,quality,url,publishedAt},classification{assetId,thesisId,
assumptionId,impact,confidence,source,rationale},citation|null,uncertain}` ·
`Decision{id,at,actor,decision,priorConviction,newConviction,evidenceIds[],
changedAssumptions[],rationale,sources[],followUp,unresolved[]}`.

**Invariant for every AI-touched record:** exactly one of `citation` or `uncertain:true`.

# Living Thesis Workspace Specification

## ADDED Requirements

### Requirement: Dashboard exposes thesis state first

The application SHALL open to a Thesis Dashboard that shows active theses, conviction, freshness, assumption status counts, open questions, and pending changes.
The primary home view SHALL NOT be a generic chat box.

#### Scenario: New counter-evidence exists

GIVEN one or more new evidence items contradict an active thesis or assumption
WHEN the dashboard renders
THEN a counter-evidence strip SHALL appear above the thesis grid
AND it SHALL link to the Evidence Inbox filtered to counter-evidence.

#### Scenario: Watchlist asset has no thesis

GIVEN an asset is present without an attached thesis
WHEN the dashboard renders
THEN it SHALL show a partial-state "No thesis yet" affordance rather than hiding the asset.

### Requirement: Evidence classification is correctable and grounded

The Evidence Inbox SHALL show each evidence item with its proposed classification, impact, confidence, source quality, rationale, and either a citation or uncertainty flag.
AI classification SHALL be labelled as a proposal until a user accepts or corrects it.

#### Scenario: Accept evidence

GIVEN a new evidence item has a classification
WHEN the user accepts it
THEN the item SHALL become accepted
AND it SHALL appear in the linked thesis evidence map.

#### Scenario: Correct evidence

GIVEN an evidence item is visible
WHEN the user corrects the classification
THEN the classification source SHALL become `user`
AND the corrected impact, thesis, assumption, confidence, and note SHALL be retained.

#### Scenario: Uncertain or weak evidence

GIVEN an item has no firm source or an unclear relation to the thesis universe
WHEN it renders
THEN it SHALL be marked uncertain or unclear
AND it SHALL NOT be forced onto a specific assumption.

### Requirement: Counter-evidence remains first-class

The system SHALL NOT hide, downrank, or merge contradictory evidence into generic summaries without visible counter-evidence markers.

#### Scenario: Counter-evidence on thesis page

GIVEN accepted evidence includes both supporting and contradicting items
WHEN the thesis page renders
THEN supporting evidence and counter-evidence SHALL appear in equal-weight columns.

### Requirement: What Changed is bounded and grounded

The What Changed view SHALL summarize material changes since each thesis's last review.
Each summary line SHALL link to supporting evidence or show an explicit no-evidence marker.
The system SHALL NOT fabricate change when no material evidence exists.

#### Scenario: Stale thesis without new evidence

GIVEN a thesis has no material new evidence and is stale
WHEN What Changed renders
THEN it SHALL state that no material new evidence exists
AND it SHALL mark the thesis overdue for review.

### Requirement: Decisions are human-authored and auditable

The decision modal SHALL require a typed human rationale.
The system SHALL append a decision trace entry containing timestamp, actor, decision, prior conviction, new conviction, evidence ids, changed assumptions, rationale, sources, follow-up, and unresolved questions.

#### Scenario: Empty rationale

GIVEN the user opens the decision modal
WHEN the user attempts to save without a rationale
THEN the system SHALL reject the save
AND SHALL NOT generate the rationale automatically.

#### Scenario: Decision recorded

GIVEN a user enters a decision and rationale
WHEN the user saves
THEN the decision trace SHALL append a new entry
AND the rationale SHALL match the user's typed text
AND no model chain-of-thought field SHALL be present.

### Requirement: No advice leakage

The system SHALL NOT emit buy/sell recommendations, price targets, or personalised financial advice.
When prompted for advice, it SHALL clarify its boundary and offer to organise evidence and decision rationale instead.

#### Scenario: Advice bait

GIVEN input asks whether to buy, sell, or assign a price target
WHEN the AI behaviour layer responds
THEN the response SHALL refuse advice or targets
AND SHALL NOT echo a recommendation.

One-line positioning

Delphi is an AI-native investment research workspace for active investors who need to maintain living theses, track evidence, surface counter-evidence, and preserve decision traces.
Delphi is not a generic financial chatbot, market data terminal, stock picker, or price predictor.
It is a memory and reasoning layer built around the user's beliefs.

Core belief

Investors are not primarily missing information.
They are missing a durable system for maintaining evolving investment judgment.
Important hypotheses drift, evidence is scattered, and rationales are forgotten.
Delphi aims to solve judgment decay by structuring research memory and change detection.

Primary user

Delphi is built for research-intensive active investors focused on public equities and adjacent investable themes.
These may include:

* Small and mid-sized investment funds
* Emerging managers and family offices
* Thematic public equity analysts
* Solo portfolio managers with concentrated watchlists

They all manage a watchlist or portfolio and need to maintain investment theses over weeks or months.

Core job-to-be-done

When new information arrives, Delphi should help the user understand:

1. Which asset, thesis or assumption the information relates to.
2. Whether the information supports, contradicts or leaves unchanged the active thesis.
3. What changed since the last review.
4. How the decision trace should be updated, including who acted and why.
5. Which sources support the claim, with explicit citations and uncertainty if evidence is thin.

Core objects

Asset

An investable object such as a public company, sector, macro theme, or other authorised instrument.
Delphi links all research to an asset or theme.

Thesis

A structured investment belief about an asset or theme.
Components include: title, summary, bull case, bear case, key assumptions, risks, catalysts, time horizon, conviction, freshness, related evidence, and related decisions.

Assumption

A proposition that must remain true for the thesis to hold.
Example: "Revenue growth will remain above 20%."

Evidence

A source-backed observation that supports, contradicts or updates a thesis or assumption.
Evidence includes: source, date, excerpt or reference, related asset, related thesis, affected assumption, impact classification, confidence, reasoning summary and citation.

Counter-evidence

Evidence that weakens or contradicts a thesis or assumption.
Delphi elevates counter-evidence rather than burying it.

Catalyst

An upcoming event that could affect a thesis, such as an earnings release, regulatory decision, product launch or index event.

Risk

A factor that could materially harm a thesis if realised.
Risks may include competition, execution issues, regulatory changes, macro headwinds or technology risks.

Decision

A human investment or research decision.
Examples: open position, increase position, reduce position, close position, downgrade conviction, move to watchlist, initiate deeper research, reject thesis.

Decision trace

A structured record of how a belief or decision evolved.
It is a human-auditable ledger capturing timestamp, actor, thesis state before change, new evidence, changed assumptions, the decision made, rationale summary, sources, unresolved questions and expected follow-up.
Decision traces do not expose the model's private reasoning.

Core workflows

Thesis dashboard

The daily home page showing the active watchlist/portfolio, current theses, conviction levels, freshness, unresolved questions, recent evidence, counter-evidence and upcoming catalysts.
Users start here to see the state of their beliefs.

Evidence inbox

A feed where new information arrives.
Each item is classified by related asset, related thesis, affected assumption, impact (supports/contradicts/neutral/unclear), source quality, confidence and recommended review action.
Users can review, correct and attach items to their thesis.

Asset / Thesis page

A dedicated workspace for one asset or thesis.
It displays the bull/bear narrative, key assumptions, risks, catalysts, evidence map, open questions and decision history.

What changed?

Users can ask: "What changed since my last review?"
Delphi summarises material changes, highlights new supporting or contradicting evidence, notes which assumptions are weakened or strengthened, and prompts the user to consider whether a human decision should be recorded.

Decision trace / Memo generator

Delphi can generate structured outputs such as IC memos, weekly updates, thesis updates, post-mortems and "why we changed our mind" reports.
These outputs are grounded in stored theses, evidence and source references.

Non-goals

Delphi explicitly does not:

* Provide personalised financial advice or buy/sell recommendations.
* Claim to predict prices or market movements.
* Replace Bloomberg, FactSet or AlphaSense as comprehensive data terminals.
    Delphi can integrate external data sources but its value lies in organising the user's own research.
* Use ontology or context graph jargon as a selling point.
    The graph exists internally to organise research memory, not to predict markets.
* Show the model's chain-of-thought as a decision trace.
    Decision traces record human rationale and evidence, not the model's inner reasoning.

Ontology / context graph stance

Ontology and context graph technology are used internally to represent relationships among assets, theses, assumptions, evidence, counter-evidence, catalysts, risks, sources, decisions and time.
They are not exposed to users and are not used to claim deterministic market causality.
Their purpose is to organise research memory and make thesis impact traceable.

UX principles

* Expose thesis state - the main view should show the user's theses and conviction, not a blank chat prompt.
* Highlight counter-evidence - contradictory evidence should be obvious and cannot be hidden in summaries.
* Answer "what changed?" - quick access to change summaries is essential.
* Ground every claim - important AI-generated statements must link back to sources or be marked uncertain.
* Enable correction - users can edit classifications and update their thesis; design clear affordances.
* Reduce cognitive load - break information into digestible pieces and avoid overly verbose text.
* Preserve uncertainty - not every question has a crisp answer; the UI should accommodate ambiguous or incomplete data.
* No ontology terms - avoid exposing knowledge graph jargon; use human-readable terms.

Quality bar

A feature is complete only when:

* Behaviour is specified in OpenSpec files.
* Implementation matches the spec.
* Unit tests pass.
* Eval cases pass, including grounding and refusal when uncertain.
* UI states are handled: empty, loading, error, partial and stale.
* Decision trace is auditable.
* No hallucination or ungrounded investment claim is introduced.
* Review is complete against the product rules.

Project

This repository contains Delphi, an AI‑native investment research workspace for active investors.
Delphi helps users maintain living investment theses, classify new evidence and counter‑evidence, surface changes that matter, and preserve auditable decision traces.
It is not a market data terminal, price predictor, or generic financial chatbot.
Read docs/product/delphi-brief.md for the product philosophy and user definitions.

Non‑negotiable product rules

These principles constrain every feature and commit:

* No ungrounded advice – Delphi must not generate buy/sell recommendations or price targets unless the user explicitly frames the decision.
* Source grounding – every investment‑relevant AI claim must reference its supporting source; if evidence is insufficient, the output must explicitly state uncertainty.
* Counter‑evidence is first‑class – the system may not hide, downrank or remove contradicting evidence in summarisation or classification.
* Thesis vocabulary – use the product concepts: thesis, assumption, evidence, counter‑evidence, catalyst, risk, decision, decision trace. Do not expose internal ontology, graph jargon, or model chain‑of‑thought.
* No generic chat drift – the core UI is not a chat box. Do not collapse the product into a general conversational agent; the home view should expose thesis state and change signals.
* User correction path – classification and summarisation outputs must be correctable by the user; include affordances for feedback and editing.
* Decision trace integrity – the decision ledger must record human rationale, evidence, and timestamps, not the model’s private reasoning.
* Privacy and compliance – respect data entitlements, confidentiality and regulatory boundaries. Do not ingest or expose proprietary data unless clearly authorised.

Engineering workflow

When implementing a feature or bug fix:

1. Understand the product intent – read docs/product/delphi-brief.md and any relevant specs under openspec/specs.
2. Check for existing specs – if a behaviour is not specified, first create or update an OpenSpec change proposal (openspec/changes/…) with behaviour‑first requirements and acceptance criteria before writing code.
    Implementation details belong in design.md or tasks.md files within the change directory.
3. Small vertical slices – implement the smallest slice that delivers user value across the stack (UI, logic, data) rather than broad scaffolding with no end‑to‑end value.
4. Tests and evals – add or update unit tests for deterministic behaviour and evaluation cases for AI‑powered features.
    Evals must cover positive, negative, ambiguous and adversarial examples and enforce grounding, uncertainty handling and decision trace integrity.
5. Run all checks – before opening a review, run linting, type checks, tests, and evals.
    Do not mark a task complete while any failures remain.
6. Review against the rules – when reviewing code, prioritise:
    – Missing source citations or grounding
    – Investment advice leakage
    – Hidden counter‑evidence
    – Broken decision trace integrity
    – UI states (empty, loading, error, partial, stale)
    – Data model drift from the thesis/evidence/assumption/decision objects
    – Hallucination risk and missing evals
7. Merge discipline – features must not be merged until OpenSpec requirements are satisfied, tests and evals pass, and the PR has been reviewed for non‑negotiable rule violations.

Prototype handoff from Claude

Claude‑generated prototypes are design artefacts located under /prototypes/.
Treat them as design intent, not production code.
Before productionising a prototype:

1. Read the prototype’s design‑notes.md, interaction‑contract.md, state‑matrix.md, component‑inventory.md, and codex‑handoff.md.
2. Create or update an OpenSpec change for the new behaviour.
3. Decide the production architecture and implement real components; do not blindly copy prototype code.
4. Preserve the user flow, information hierarchy and product language from the prototype unless there is a compelling engineering reason not to.
5. Add tests and evals for all new AI behaviour.
6. Run all checks and review the diff for rule violations.

Definition of done

A task is done only when:

* The behaviour is specified in an OpenSpec file and satisfied by the implementation.
* Tests pass and cover the functional requirements.
* Evals pass and cover AI behaviour, including grounding and uncertainty.
* UI handles empty, loading, error, partial and stale data states.
* No ungrounded investment claims or advice leakage is introduced.
* Counter‑evidence remains visible.
* Decision trace integrity is preserved.
* The diff has been reviewed against this document and the product brief.

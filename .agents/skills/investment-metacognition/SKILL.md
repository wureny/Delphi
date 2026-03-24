---
name: investment-metacognition
description: Meta-cognition and orchestration layer for investment analysis. Use when users ask for stock analysis, portfolio decisions, long-term thesis work, valuation judgment, earnings interpretation, regime/sector context, or when multiple investment skills should be combined instead of relying on a single framework. This skill should run first for equity research tasks, decompose the decision, choose the right sub-skills, arbitrate conflicts, and produce one final judgment.
---

# Investment Metacognition

## Core Role

Think before analyzing.
Do not start with a single framework.
First decide what the real investment question is, then choose the minimum set of sub-skills needed to answer it.

This skill is the top layer for equity analysis.
Its job is to:
- classify the decision,
- route work to the right sub-skills,
- assign weight to each sub-skill,
- resolve conflicting conclusions,
- run a pre-mortem checklist before capital is committed,
- run a post-mortem checklist after outcomes are known,
- return one final investment judgment.

## Mandatory Operating Rules

- Always start with the question behind the question.
- Do not let any one sub-skill dominate by default.
- Do not average frameworks mechanically.
- Always end with one final verdict and one action plan.
- If sub-skills disagree, explain the disagreement, pick a winner, and state why.
- If the user asks for a simple stock take, still run this layer first.
- Treat repeat mistakes as system failures, not bad luck.
- Convert observed mistakes into reusable checklist items.

## Workflow

### Step 1: Identify Decision Type

Classify the user's real task into one or more of these buckets:
- `Survival and asymmetry`
  Use when the key question is whether the business can fail, compound, or rerate massively.
- `Quality and value`
  Use when the question is about durability, ROE, balance sheet, free cash flow, and moat quality.
- `Earnings and inflection`
  Use when the question is about the latest quarter, guidance, operating trend, or key forces from recent results.
- `Regime and rotation`
  Use when rates, liquidity, regulation, sector rotation, or macro backdrop may dominate multiple expansion or compression.
- `Position action`
  Use when the user needs price zones, sizing, trim/add triggers, or holding discipline.

If the question is broad, assume all five buckets matter.

### Step 2: Select Sub-Skills

Use these sub-skills as building blocks:
- `equity-zero-or-hundred`
  Best for survival risk, asymmetry, regime sensitivity, scenario tree, and decisive action zones.
- `us-value-investing`
  Best for business quality, balance sheet safety, FCF quality, and moat durability.
- `tech-earnings-deepdive`
  Best for recent quarter analysis, guidance, key forces, management signaling, and execution trend.
- `investment-error-library`
  Best for post-mortem review, mistake classification, checklist evolution, and updating process memory.
- `macro-liquidity`
  Use when liquidity and monetary backdrop are central to valuation.
- `us-market-sentiment`
  Use when sentiment, positioning, and near-term risk appetite matter.

Read `references/routing-matrix.md` when selecting or weighting sub-skills.

### Step 3: Assign Weights

Assign explicit weights before synthesis.
Default weighting by decision type:
- `Survival and asymmetry`: `equity-zero-or-hundred` 50%, `us-value-investing` 25%, `tech-earnings-deepdive` 15%, macro/sentiment 10%
- `Quality and value`: `us-value-investing` 45%, `equity-zero-or-hundred` 30%, `tech-earnings-deepdive` 15%, macro/sentiment 10%
- `Earnings and inflection`: `tech-earnings-deepdive` 50%, `equity-zero-or-hundred` 25%, `us-value-investing` 15%, macro/sentiment 10%
- `Regime and rotation`: `macro-liquidity` 35%, `us-market-sentiment` 20%, `equity-zero-or-hundred` 25%, `tech-earnings-deepdive` 10%, `us-value-investing` 10%
- `Position action`: `equity-zero-or-hundred` 40%, `tech-earnings-deepdive` 25%, `us-value-investing` 20%, macro/sentiment 15%

Adjust weights if the stock or situation clearly demands it.

### Step 4: Run Conflict Checks

Before producing the final answer, explicitly check:
- Does recent earnings strength conflict with weak long-term economics?
- Does business quality conflict with a hostile macro regime?
- Does upside asymmetry conflict with excessive current valuation?
- Does sentiment support the move, or is it already overcrowded?

Then decide which conflict matters most.

### Step 5: Run Checklist Discipline

Before finalizing a recommendation, run two checklist passes:

- `Pre-decision checklist`
  Ask what obvious error the investor is at risk of making now.
- `Failure-mode checklist`
  Ask how this thesis most likely goes wrong in practice, not in theory.
- `Pattern check`
  Scan the named mistake patterns in `/Users/wurenyu/workspace/skills/trading/investment-process/error-patterns.md` and ask whether any prior failure pattern matches this setup.

Read `references/checklist-evolution.md` when you need checklist categories or update rules.

### Step 6: Create Learning Loop

If there is a prior outcome, run a short post-mortem:
- What actually happened?
- Which assumption failed?
- Was the mistake analytical, psychological, sizing-related, or timing-related?
- What new checklist item should exist next time?

When the user is explicitly reviewing a prior trade, thesis, or miss, route to `investment-error-library` as a primary sub-skill.

Do not stop at "I was wrong."
Translate the miss into a reusable guardrail.

## Arbitration Rules

Use these tie-break rules in order:

1. Survival beats valuation.
If a business can plausibly break, low multiples do not make it safe.

2. Business quality beats quarter noise.
One strong or weak quarter should not overturn a multi-year thesis alone.

3. Regime can delay a correct thesis.
A good company can still be a bad stock in the wrong rate or liquidity regime.

4. Price matters after thesis.
First decide whether the business is worth owning. Then decide whether the stock is buyable here.

5. Final output must be decisive.
Never end with "depends" unless you immediately convert it into explicit trigger conditions.

6. Checklist beats memory.
If a known failure mode exists, enforce the checklist even when the thesis feels strong.

## Final Output Contract

Always structure the answer in this order:

1. `Meta View`
State the real investment question in one sentence.

2. `Skill Stack Used`
List which sub-skills were used and why.

3. `Core Judgment`
Give one clear verdict: `Bullish`, `Neutral`, or `Bearish`.

4. `Why This Verdict Wins`
State the 2-4 decisive reasons that outweighed the others.

5. `Where The Other Frameworks Disagree`
Briefly note any disagreement and why it loses.

6. `Price Action Map`
Give buy, hold, trim, and avoid zones if price data is available.

7. `Checklist Risks`
List the 3-5 most likely avoidable mistakes for this setup.

8. `What Would Change My Mind`
Give hard disconfirming evidence or triggers.

## Guardrails

- Do not pretend all frameworks are equally useful for every stock.
- Do not let valuation-only logic dominate high-optionality businesses.
- Do not let narrative-only logic dominate low-quality businesses.
- Do not hide behind complexity; reduce it to the one decision that matters most.
- Prefer sharp synthesis over long summaries of each sub-skill.
- Build process memory externally in checklists, not implicitly in prose.

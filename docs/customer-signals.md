# Customer Signals Log

Evidence about buy-side workflow and demand, kept apart from assumptions. **Desk research** means public sources the team read. **Interview** entries are firsthand conversations and should be added here as they happen. Each finding ends with the product decision it drives.

## Desk research: 2026-09-27

### S1. The painful window is the hours right after the print, and it's the PM who asks

- When results surprise and a stock moves around 10%, the PM wants to know within hours whether the thesis is broken or the market overreacted. ([Life on the Buy Side](https://www.lifeonthebuyside.com/earnings-season/))
- Buy-side analysts avoid asking questions on public calls, so they don't signal their positions. They follow up with management privately. (same source)
- Analysts typically cover 25–30 names. Updating the model after results takes about 1–1.5 hours per company, before any thesis work starts. ([Wall Street Oasis thread](https://www.wallstreetoasis.com/forum/hedge-fund/buy-side-er-analysts-how-many-companies-do-you-cover), [Finance Context](https://financecontext.com/en/equity-research/skills/model-update))
- A practitioner post describes AI earnings summaries in under 15 minutes. The comments single out "print → usable model update" as the step where AI earns its keep. ([LinkedIn](https://www.linkedin.com/posts/rayyyang_most-hedge-fund-analysts-spend-hours-updating-activity-7444876483631783936-fmD9))

**Product implications**
- Treat time-to-brief as a headline KPI: minutes from the SEC acceptance timestamp to reviewable proposals. The engine already records both timestamps.
- Add an output for the PM: "is the thesis broken?" in one screen, not a full review queue.
- `recommendedFollowUp` should become a private list of management follow-up questions, since that is how the buy side actually works.
- Excel model reconciliation is where the hours are. It stays P1.

### S2. Retail-grade thesis monitoring is already a commodity

- Several consumer products already monitor theses. Helm scores user-written pillars against SEC filings with verbatim citations at $20/mo. MyThesis charges $4.99 per holding per month. ThesisLoop charges $60–200/yr. Vela and UseThesis are on waitlists. ([Helm landscape post](https://helmterminal.dev/blog/thesis-tracking-apps))
- None of them advertises team roles, approvals, versioned thesis state, audit, or model reconciliation. (same source; vendor-authored, so read with bias)

**Product implications**
- Do not pitch "AI tells you when your thesis drifts". It is a $20 feature.
- Delphi's wedge is the institutional layer those products lack:
  - shared, versioned team state;
  - who is allowed to change it, with PM approval for material changes;
  - a point-in-time ledger;
  - reconciliation against the team's own forecasts.
- Pitch it as "the system of record for what your team believes, updated safely within minutes of the print."
- Price to match: per team or per seat at institutional levels, not per holding.

### S3. What makes analysts reject AI tools

- Output without citations they can check, tools that fragment the workflow across yet another platform, and adoption imposed from above. ([Marvin Labs](https://www.marvin-labs.com/resources/equity-research-automation/))
- Reviews repeatedly complain about hallucinations in some AI analyst platforms. ([V7 Labs roundup](https://www.v7labs.com/blog/rogo-ai-alternatives-investment-banking))

**Product implications**
- Keep verbatim-quote verification and blocked-proposal reporting as visible features. Showing what we refused to claim is part of the pitch.
- Delivery has to meet analysts where they already work: email or Slack brief, Excel. Don't require living in Delphi's UI.

## Hypotheses for interviews to confirm or kill

| # | Hypothesis | Signal that would kill it |
|---|---|---|
| H1 | Analysts at 5–50 person funds spend 2+ hours per name on print night reconciling results against model and thesis. | Most say under 1 hour, or that consensus/data vendors already do it. |
| H2 | PMs want a thesis verdict within 2 hours of the print, and today it arrives late or verbally. | PMs say the analyst's morning note is early enough. |
| H3 | The team's thesis is not written down in one place, and that causes problems at handoffs. | Teams already keep structured thesis docs they're happy with. |
| H4 | COO or compliance would pay for an auditable record of why a view changed. | "Nobody asks for that" from 3+ COOs. |
| H5 | Funds will let a vendor read their Excel model if it runs in their environment or on their own model key. | Data-security objections persist even with self-hosting. |

## Interview log

_Add firsthand interviews here: date, role, fund type or AUM band, key quotes (with permission), which hypotheses they moved._

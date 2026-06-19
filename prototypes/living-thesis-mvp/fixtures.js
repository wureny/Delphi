/*
 * Delphi — Living Thesis MVP prototype
 * fixtures.js — fixed sample data. NOT production data, NOT a schema of record.
 *
 * This file exists so the prototype can demonstrate every UI state without a
 * backend. Codex should treat the *shape* of these objects as a design
 * suggestion only; the canonical data model lives in OpenSpec specs.
 *
 * Design intent encoded in the data:
 *  - Counter-evidence is a first-class field on evidence (impact: "contradicts").
 *  - Every AI-derived field carries either a `citation` or `uncertain: true`.
 *  - Classifications carry `source: "ai" | "user"` so corrections are visible.
 *  - Freshness is a timestamp + derived staleness, never a vague "recently".
 */

const NOW = new Date('2026-06-19T09:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;
const ago = (days) => NOW - days * DAY;

window.DELPHI_FIXTURES = {
  meta: {
    now: NOW,
    user: { name: 'A. Mercer', role: 'PM — concentrated public-equity book' },
  },

  // ---- Assets -------------------------------------------------------------
  assets: [
    { id: 'nvda', name: 'NVIDIA', ticker: 'NVDA', kind: 'equity' },
    { id: 'retl', name: 'RetailCo', ticker: 'RETL', kind: 'equity' },
    { id: 'ddog', name: 'Datadog', ticker: 'DDOG', kind: 'equity' },
    { id: 'estc', name: 'Elastic', ticker: 'ESTC', kind: 'equity' }, // watchlist, no thesis yet
  ],

  /*
   * Theses. conviction is 0–100 with a band label. freshness is the last time
   * the user actively reviewed (not the last time data changed). unresolved is
   * the count of open questions. `pendingChanges` is how many un-reviewed
   * changes the What-Changed engine has detected since `lastReviewed`.
   */
  theses: [
    {
      id: 'th_nvda',
      assetId: 'nvda',
      title: 'Data-center AI capex stays durable through 2027',
      summary:
        'Hyperscaler accelerator demand outruns supply into 2027; NVIDIA keeps >80% share and pricing power as the full-stack (chips + networking + CUDA) raises switching costs.',
      conviction: 78,
      convictionBand: 'high',
      timeHorizon: '18–24 months',
      lastReviewed: ago(2),
      pendingChanges: 3,
      unresolved: 2,
      bull: 'Compute demand is supply-constrained; networking + software lock-in widen the moat beyond the GPU die.',
      bear: 'Custom silicon (TPU/Trainium/MTIA) and an inference-cost cliff compress both share and margin faster than consensus.',
      assumptions: [
        {
          id: 'a_nvda_1',
          text: 'Hyperscaler AI capex grows >25% YoY through FY2027',
          status: 'holding',
          critical: true,
          note: 'Falsifier: two consecutive quarters of guided capex cuts from top-4 buyers.',
        },
        {
          id: 'a_nvda_2',
          text: 'NVIDIA retains >80% of training accelerator share',
          status: 'weakening',
          critical: true,
          note: 'Pressured by Google TPU external availability — see evidence ev_3.',
        },
        {
          id: 'a_nvda_3',
          text: 'Gross margin holds above 70%',
          status: 'holding',
          critical: false,
          note: '',
        },
      ],
      risks: [
        { id: 'r_nvda_1', text: 'Export-control expansion to more regions', severity: 'medium' },
        { id: 'r_nvda_2', text: 'Inference shifts to cheaper custom ASICs', severity: 'high' },
      ],
      catalysts: [
        { id: 'c_nvda_1', text: 'Q2 FY27 earnings', date: ago(-21), kind: 'earnings' },
        { id: 'c_nvda_2', text: 'Hyperscaler capex guidance (MSFT/GOOG calls)', date: ago(-9), kind: 'print' },
      ],
    },
    {
      id: 'th_retl',
      assetId: 'retl',
      title: 'RetailCo turns store modernisation into durable margin expansion',
      summary:
        'Inventory automation and membership growth support higher throughput per store while private-label mix expands gross margin.',
      conviction: 54,
      convictionBand: 'medium',
      timeHorizon: '12 months',
      lastReviewed: ago(11),
      pendingChanges: 4,
      unresolved: 3,
      bull: 'Store automation lowers shrink and labour intensity; membership engagement raises repeat purchase frequency.',
      bear: 'Execution issues in automated fulfilment and weakening traffic could pressure the margin expansion narrative.',
      assumptions: [
        {
          id: 'a_retl_1',
          text: 'Automated fulfilment downtime stays below 2% in any rolling quarter',
          status: 'broken',
          critical: true,
          note: 'Falsified by the February regional outage — see counter-evidence ev_5.',
        },
        {
          id: 'a_retl_2',
          text: 'Membership-driven comparable sales grow >4% YoY',
          status: 'holding',
          critical: true,
          note: '',
        },
        {
          id: 'a_retl_3',
          text: 'Reported traffic gains are organic, not promotion-driven',
          status: 'uncertain',
          critical: false,
          note: 'Data quality is contested; flagged uncertain rather than forced.',
        },
      ],
      risks: [
        { id: 'r_retl_1', text: 'Fulfilment outage recurrence', severity: 'high' },
        { id: 'r_retl_2', text: 'Promotion-heavy traffic masking weak demand', severity: 'medium' },
      ],
      catalysts: [
        { id: 'c_retl_1', text: 'Automation rollout update', date: ago(-30), kind: 'company update' },
      ],
    },
    {
      id: 'th_ddog',
      assetId: 'ddog',
      title: 'Datadog cross-sells its way to durable 25%+ growth',
      summary:
        'Observability land-and-expand plus new security/AI products lift net revenue retention back above 115%.',
      conviction: 61,
      convictionBand: 'medium',
      timeHorizon: '12–18 months',
      lastReviewed: ago(38), // deliberately stale to demo the stale state
      pendingChanges: 1,
      unresolved: 1,
      bull: 'Multi-product adoption deepens; AI-driven log volume is a tailwind.',
      bear: 'Customer cost-optimization caps usage-based upside; NRR has been drifting down.',
      assumptions: [
        {
          id: 'a_ddog_1',
          text: 'Net revenue retention re-accelerates above 115%',
          status: 'weakening',
          critical: true,
          note: '',
        },
        {
          id: 'a_ddog_2',
          text: '6+ product adoption keeps rising among top accounts',
          status: 'holding',
          critical: false,
          note: '',
        },
      ],
      risks: [{ id: 'r_ddog_1', text: 'Usage optimization by large customers', severity: 'medium' }],
      catalysts: [{ id: 'c_ddog_1', text: 'Q2 earnings', date: ago(-26), kind: 'earnings' }],
    },
  ],

  /*
   * Evidence. Lives in the inbox until triaged. status:
   *   "new"       — awaiting review
   *   "accepted"  — attached to a thesis/assumption
   *   "dismissed" — irrelevant / noise
   * classification.source tells the UI whether a human has corrected the AI.
   * Every item either has a `citation` or is `uncertain: true`.
   */
  evidence: [
    {
      id: 'ev_1',
      status: 'new',
      receivedAt: ago(0.2),
      headline: 'Microsoft reiterates FY27 AI capex "will increase materially YoY"',
      excerpt:
        '"We expect capital expenditures to increase on a sequential and year-over-year basis, driven by demand for our AI and cloud services." — CFO, FQ remarks.',
      source: { name: 'MSFT earnings call transcript', quality: 'high', url: '#', publishedAt: ago(0.4) },
      classification: {
        assetId: 'nvda',
        thesisId: 'th_nvda',
        assumptionId: 'a_nvda_1',
        impact: 'supports',
        confidence: 'high',
        source: 'ai',
        rationale: 'Top-4 buyer guiding capex up YoY directly supports the >25% capex-growth assumption.',
      },
      citation: { label: 'MSFT call · FQ', url: '#' },
      uncertain: false,
    },
    {
      id: 'ev_2',
      status: 'new',
      receivedAt: ago(0.5),
      headline: 'RetailCo membership comparable sales up 5.2% YoY',
      excerpt: 'Company channel data showed membership-linked comparable sales increased 5.2% year-over-year.',
      source: { name: 'Company sales update', quality: 'medium', url: '#', publishedAt: ago(0.6) },
      classification: {
        assetId: 'retl',
        thesisId: 'th_retl',
        assumptionId: 'a_retl_2',
        impact: 'supports',
        confidence: 'medium',
        source: 'ai',
        rationale: '5.2% YoY clears the >4% threshold in the membership comparable-sales assumption.',
      },
      citation: { label: 'Company sales update', url: '#' },
      uncertain: false,
    },
    {
      id: 'ev_3',
      status: 'new',
      receivedAt: ago(1),
      headline: 'Google to offer TPU v6 to external cloud customers',
      excerpt:
        'Report: Google will make its latest TPUs available to external customers via rentals and on-prem appliances, expanding the merchant accelerator market.',
      source: { name: 'Tier-1 tech press', quality: 'high', url: '#', publishedAt: ago(1.1) },
      classification: {
        assetId: 'nvda',
        thesisId: 'th_nvda',
        assumptionId: 'a_nvda_2',
        impact: 'contradicts', // counter-evidence
        confidence: 'medium',
        source: 'ai',
        rationale: 'External TPU availability is a direct share threat to the >80% accelerator-share assumption.',
      },
      citation: { label: 'Tech press report', url: '#' },
      uncertain: false,
    },
    {
      id: 'ev_4',
      status: 'new',
      receivedAt: ago(1.4),
      headline: 'Influencer thread: "RETL doubles by year-end"',
      excerpt: 'Viral thread arguing RETL shares will double. No primary data; price-target framing.',
      source: { name: 'Social post', quality: 'low', url: '#', publishedAt: ago(1.5) },
      classification: {
        assetId: 'retl',
        thesisId: null,
        assumptionId: null,
        impact: 'unclear',
        confidence: 'low',
        source: 'ai',
        rationale:
          'Opinion/price-prediction with no verifiable source. Flagged unclear and not attached to any assumption. Delphi does not act on price targets.',
      },
      citation: null,
      uncertain: true,
    },
    {
      id: 'ev_5',
      status: 'accepted', // already triaged — shows in thesis evidence map, demonstrates counter-evidence
      receivedAt: ago(9),
      headline: 'RetailCo automated fulfilment outage disrupted two regions for five hours',
      excerpt: 'Operations post-mortem said automated fulfilment downtime lasted roughly five hours across two regions.',
      source: { name: 'Company operations post-mortem', quality: 'high', url: '#', publishedAt: ago(9.2) },
      classification: {
        assetId: 'retl',
        thesisId: 'th_retl',
        assumptionId: 'a_retl_1',
        impact: 'contradicts',
        confidence: 'high',
        source: 'user', // user corrected/confirmed
        rationale: 'A regional fulfilment outage directly falsifies the downtime threshold assumption.',
      },
      citation: { label: 'Ops post-mortem', url: '#' },
      uncertain: false,
    },
    {
      id: 'ev_6',
      status: 'new',
      receivedAt: ago(0.8),
      headline: 'Semiconductor distributor raises FY guide',
      excerpt: 'A passive-components distributor raised its annual revenue guide on broad industrial demand.',
      source: { name: 'Newswire', quality: 'medium', url: '#', publishedAt: ago(0.9) },
      classification: {
        assetId: null, // AI is unsure this relates to a tracked asset
        thesisId: null,
        assumptionId: null,
        impact: 'unclear',
        confidence: 'low',
        source: 'ai',
        rationale:
          'Mentions semiconductors but the issuer is a passive-components distributor, not in your universe. Likely unrelated — surfaced for you to confirm or dismiss.',
      },
      citation: { label: 'Newswire', url: '#' },
      uncertain: true,
    },
  ],

  /*
   * What-Changed log, per thesis, since the user's last review. The engine
   * produces a *summary* plus the list of underlying change events; every
   * summary line links to its evidence. conviction suggestion is a prompt to
   * the user, never an automatic change.
   */
  whatChanged: {
    th_nvda: {
      since: ago(2),
      summary: [
        { text: 'Capex durability assumption reinforced by a top-4 buyer guiding spend up YoY.', evidenceId: 'ev_1' },
        { text: 'Accelerator-share assumption now contested: external TPU availability is a new share threat.', evidenceId: 'ev_3' },
      ],
      events: [
        { kind: 'evidence_added', evidenceId: 'ev_1', impact: 'supports', assumptionId: 'a_nvda_1' },
        { kind: 'evidence_added', evidenceId: 'ev_3', impact: 'contradicts', assumptionId: 'a_nvda_2' },
        { kind: 'assumption_status', assumptionId: 'a_nvda_2', from: 'holding', to: 'weakening' },
      ],
      convictionSuggestion: {
        direction: 'review',
        text: 'One assumption strengthened and one critical assumption weakened. Net: re-examine, no obvious conviction change.',
        uncertain: true,
      },
    },
    th_retl: {
      since: ago(11),
      summary: [
        { text: 'Fulfilment reliability assumption was falsified by a multi-hour outage.', evidenceId: 'ev_5' },
        { text: 'Membership comparable-sales assumption strengthened (+5.2% YoY).', evidenceId: 'ev_2' },
      ],
      events: [
        { kind: 'assumption_status', assumptionId: 'a_retl_1', from: 'holding', to: 'broken' },
        { kind: 'evidence_added', evidenceId: 'ev_5', impact: 'contradicts', assumptionId: 'a_retl_1' },
        { kind: 'evidence_added', evidenceId: 'ev_2', impact: 'supports', assumptionId: 'a_retl_2' },
      ],
      convictionSuggestion: {
        direction: 'down',
        text: 'A critical reliability assumption is now broken. Consider whether conviction (54) still reflects that.',
        uncertain: false,
      },
    },
    th_ddog: {
      since: ago(38),
      summary: [
        { text: 'No material new evidence in 38 days — this thesis is stale and overdue for review.', evidenceId: null },
      ],
      events: [],
      convictionSuggestion: {
        direction: 'review',
        text: 'Stale: last reviewed 38 days ago. Re-confirm or revise before relying on it.',
        uncertain: true,
      },
    },
  },

  /*
   * Decision traces, per thesis. A human-auditable ledger. Note: rationale is
   * the USER's words; the model never writes a decision rationale on its own,
   * and no field exposes model chain-of-thought.
   */
  decisionTraces: {
    th_nvda: [
      {
        id: 'd_nvda_1',
        at: ago(2),
        actor: 'A. Mercer',
        decision: 'Hold position',
        priorConviction: 80,
        newConviction: 78,
        evidenceIds: ['ev_3'],
        changedAssumptions: ['a_nvda_2'],
        rationale: 'External TPU news is a real share risk but not yet in the numbers. Trimming conviction slightly; revisit after hyperscaler capex prints.',
        sources: ['Tech press report'],
        followUp: 'Re-check accelerator-share assumption after MSFT/GOOG capex guidance (~9 days).',
        unresolved: ['Will external TPU actually ship at volume, or is this a press signal only?'],
      },
      {
        id: 'd_nvda_0',
        at: ago(60),
        actor: 'A. Mercer',
        decision: 'Open position',
        priorConviction: null,
        newConviction: 80,
        evidenceIds: [],
        changedAssumptions: [],
        rationale: 'Initiating on supply-constrained compute demand and full-stack lock-in. Sized at 6% of book.',
        sources: [],
        followUp: 'Build out assumption falsifiers; track capex guidance each quarter.',
        unresolved: [],
      },
    ],
    th_retl: [
      {
        id: 'd_retl_1',
        at: ago(9),
        actor: 'A. Mercer',
        decision: 'Downgrade conviction',
        priorConviction: 66,
        newConviction: 54,
        evidenceIds: ['ev_5'],
        changedAssumptions: ['a_retl_1'],
        rationale: 'The outage breaks the core reliability claim that underpins the margin-expansion thesis. Cutting conviction; not exiting because membership sales are still improving.',
        sources: ['Ops post-mortem'],
        followUp: 'Watch the next automation rollout update for reliability improvement before re-adding.',
        unresolved: ['Is the outage a one-off or structural?'],
      },
    ],
    th_ddog: [],
  },
};

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/primitives";
import { BLOCK_REASON_HELP } from "@/live/help";

export const metadata = { title: "Guide" };

const SECTIONS = [
  { id: "what", title: "What Delphi does" },
  { id: "quick-start", title: "Quick start (5 minutes)" },
  { id: "concepts", title: "Key concepts" },
  { id: "reading", title: "Reading a proposal" },
  { id: "reviewing", title: "Reviewing and approving" },
  { id: "roles", title: "Roles and permissions" },
  { id: "blocked", title: "Why a proposal is blocked" },
  { id: "gaps", title: "Coverage gaps and “release only”" },
  { id: "forecasts", title: "Forecasts and actuals" },
  { id: "sharing", title: "Sharing and importing runs" },
  { id: "data", title: "Your data" },
  { id: "limits", title: "Current limitations" },
  { id: "faq", title: "FAQ" },
] as const;

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-20 border-b border-line pb-1.5 text-lg font-semibold tracking-[-0.02em] text-ink">
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[13.5px] leading-relaxed text-ink-2">{children}</p>;
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-[3px] border border-line">
      <table className="w-full min-w-[520px] text-left text-[12.5px]">
        <thead className="border-b border-line bg-inset text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/60 align-top last:border-0">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-ink-2">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return <div className="rounded-[3px] border border-info/25 bg-info-dim px-3 py-2.5 text-[13px] leading-relaxed text-ink">{children}</div>;
}

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-accent hover:underline">{children}</Link>
);

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Guide</h1>
        <Badge tone="neutral">Prototype · updated Sep 2026</Badge>
      </div>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-2">
        How to run Delphi on an earnings release, review what it proposes, and keep a defensible record of what your team believes.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Guide contents" className="lg:sticky lg:top-20 lg:self-start">
          <ol className="space-y-1 text-xs">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-[3px] px-2 py-1 text-ink-2 hover:bg-inset hover:text-ink">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 max-w-3xl space-y-10">
          <section className="space-y-3">
            <H2 id="what">What Delphi does</H2>
            <P>
              When a company reports, Delphi reads the new filing against your team&apos;s <strong>approved thesis</strong>: its pillars,
              forecasts, risks and open questions. It then proposes specific changes. Each proposal says what changed, what you believed
              before, why it matters and what to follow up on, and it links to the exact sentences in the filing.
            </P>
            <P>
              Nothing changes automatically. An analyst or PM accepts, rejects, escalates or defers each proposal. Approved changes become a
              new, versioned thesis, and the <strong>Decision Ledger</strong> records who changed what, when, and on which evidence.
            </P>
            <Callout>
              Delphi is not a chatbot and not a summary tool. The model&apos;s output is treated as an <em>untrusted draft</em>. Every quote
              is checked word-for-word against the filing and every number is checked against the source. Anything that fails is blocked
              before you see it as reviewable.
            </Callout>
          </section>

          <section className="space-y-3">
            <H2 id="quick-start">Quick start (5 minutes)</H2>
            <Steps
              items={[
                <>Open the <A href="/live">Live Desk</A> from the left navigation.</>,
                <>Under <strong>1 · Choose a thesis</strong>, pick a company. Read the thesis summary so you know what the team believed.</>,
                <>Under <strong>2 · Run on the latest filing</strong>, click <strong>Analyze</strong>. Delphi fetches the company&apos;s latest earnings release from SEC EDGAR and streams its progress. A run usually takes 40–120 seconds.</>,
                <>When the run finishes you land on the run page. Read the <strong>Brief</strong> first, then work through each proposal card.</>,
                <>For each card, open the evidence quotes, then choose <strong>Accept</strong>, <strong>Reject</strong>, <strong>Escalate</strong> or <strong>Defer</strong>.</>,
                <>When you are done, click <strong>Apply → vN</strong> in the right-hand panel. The thesis moves to a new version, and the change appears in the run&apos;s Decision Ledger with a before/after diff.</>,
              ]}
            />
            <P>
              No live access? Use <strong>Import run file</strong> on the Live Desk to open a saved run, or explore the guided demo in the{" "}
              <A href="/demo">Change Inbox</A>.
            </P>
          </section>

          <section className="space-y-3">
            <H2 id="concepts">Key concepts</H2>
            <Table
              head={["Term", "Meaning"]}
              rows={[
                ["Approved thesis", "The team's current official view: pillars (with conviction), forecasts, risks, open questions and catalysts. Versioned: v1, v2, …"],
                ["Event", "A new piece of evidence, today an SEC 8-K earnings release (Item 2.02, Exhibit 99.1)."],
                ["Run", "One analysis of one event against one thesis version. It is recorded with its model, prompt version, sources and timing."],
                ["Proposal", "A specific suggested change to one thesis object, with evidence. It is a draft until a human approves it."],
                ["Evidence quote", "A verbatim passage from the filing, or from your thesis, that supports a proposal. Delphi checks every quote exists."],
                ["Blocked proposal", "A proposal that failed verification. You can see it and the reason, but it can never be approved."],
                ["Coverage gap", "A thesis item the filing cannot resolve, for example something that needs the earnings call. Listed, not guessed."],
                ["Apply", "Turns all approved proposals into one new thesis version, atomically. If any change is invalid, nothing changes."],
                ["Decision Ledger", "The permanent record of version changes: before/after, evidence, approver, time and content hashes."],
              ]}
            />
          </section>

          <section className="space-y-3">
            <H2 id="reading">Reading a proposal</H2>
            <P>Each card is built to be read in under a minute:</P>
            <Table
              head={["Section", "What to look for"]}
              rows={[
                [<strong key="h">Headline & badges</strong>, "Materiality (low → critical), the type of object, who must approve it (Analyst or PM), and model confidence."],
                [<strong key="w">What changed</strong>, "What the filing now says, in at most two sentences. Every number here was checked against the cited evidence."],
                [<strong key="a">Against our view</strong>, "What the approved thesis said before, grounded in a quote from your thesis."],
                [<strong key="y">Why it matters</strong>, "The investment consequence. This is the model's reasoning, so judge it."],
                [<strong key="u">Uncertainties / Follow-up</strong>, "What the evidence does not prove, and what to ask management or check next."],
                [<strong key="p">Proposed change</strong>, "The exact field change to the thesis, for example “Set pillar ‘Azure demand’ team conviction → high”."],
                [<strong key="e">Evidence</strong>, "Verified quotes. Open “Full excerpt” to see the surrounding text, or “Filing” to open the SEC document."],
              ]}
            />
            <Callout>
              A quote being verified means it <em>exists</em> in the filing, not that the interpretation is right. Read the full excerpt
              for anything material, especially around GAAP vs non-GAAP, constant currency, and one-off items.
            </Callout>
          </section>

          <section className="space-y-3">
            <H2 id="reviewing">Reviewing and approving</H2>
            <Table
              head={["Action", "Use it when", "Effect"]}
              rows={[
                [<strong key="1">Accept</strong>, "You agree with the change as proposed.", "Recorded as approved; applied on the next Apply."],
                [<strong key="2">Reject</strong>, "It is wrong, immaterial, a duplicate, or already reflected. Pick a reason.", "Recorded in the review history with your reason; never applied."],
                [<strong key="3">Escalate</strong>, "It needs PM judgment, or it requires PM approval and you are an analyst.", "Marked as escalated to the PM; a PM can then accept or reject it."],
                [<strong key="4">Defer</strong>, "You need more information, for example the earnings call.", "Marked as deferred for 7 days; not applied."],
              ]}
            />
            <P>
              Approving and applying are separate steps on purpose. You can approve several proposals, look at the list under{" "}
              <strong>Apply to thesis</strong>, and then commit them together as one new version.
            </P>
          </section>

          <section className="space-y-3">
            <H2 id="roles">Roles and permissions</H2>
            <P>Use <strong>Acting as</strong> in the top bar to switch between Analyst and PM. In this prototype the switch is a demo control, not a login.</P>
            <Table
              head={["", "Analyst", "PM"]}
              rows={[
                ["Accept low/medium-materiality proposals", "Yes", "Yes"],
                ["Accept high/critical-materiality proposals", "No — must escalate", "Yes"],
                ["Reject, escalate, defer", "Yes", "Yes"],
                ["Apply approved changes", "Yes", "Yes"],
                ["Approve a blocked proposal", "Never", "Never"],
              ]}
            />
            <P>These rules are enforced by Delphi itself, not by the screen. An action that is not permitted is refused with an explanation.</P>
          </section>

          <section className="space-y-3">
            <H2 id="blocked">Why a proposal is blocked</H2>
            <P>
              Blocked proposals appear in a separate panel on the run page. Blocking is Delphi working as intended: it is what we refused to
              claim. Common reasons:
            </P>
            <Table
              head={["Reason code", "Meaning", "What to do"]}
              rows={Object.entries(BLOCK_REASON_HELP).map(([code, h]) => [
                <span key={code} className="font-mono text-[11.5px] text-ink">{code}</span>,
                <span key="m"><strong className="text-ink">{h.title}.</strong> {h.meaning}</span>,
                h.whatToDo,
              ])}
            />
          </section>

          <section className="space-y-3">
            <H2 id="gaps">Coverage gaps and “release only”</H2>
            <P>
              Today Delphi reads the <strong>earnings release</strong> only. It does not yet read the call transcript, the 10-Q, or your
              models. Runs are therefore labeled <Badge tone="warn">Release only — transcript not ingested</Badge>. Thesis items that need
              management commentary appear under <strong>Not resolvable from this filing</strong> instead of being guessed. Treat them as
              your checklist for the call.
            </P>
          </section>

          <section className="space-y-3">
            <H2 id="forecasts">Forecasts and actuals</H2>
            <P>
              When a filing reports the period a forecast covers, Delphi proposes to <strong>record the actual beside the forecast</strong>{" "}
              and mark it closed. For example, forecast 9.0% and actual 11.2%. Your original forecast is never overwritten, so you can always
              see what you expected versus what happened. Delphi proposes changing a forecast value only to revise a <em>future</em> period.
            </P>
          </section>

          <section className="space-y-3">
            <H2 id="sharing">Sharing and importing runs</H2>
            <P>
              A run can be saved as a file (for example from the command line or an evaluation) and opened by anyone with{" "}
              <strong>Import run file</strong> on the Live Desk. On import, Delphi re-checks everything: source hashes, every quote, every
              number and every proposed change. A file that has been edited is rejected with the reason.
            </P>
            <P>Runs you open are kept in your browser (the last 12). Clearing site data removes them.</P>
          </section>

          <section className="space-y-3">
            <H2 id="data">Your data</H2>
            <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-ink-2">
              <li>
                <strong className="text-ink">Sent to the model provider:</strong> the public SEC filing and the thesis you selected. Requests
                are made from Delphi&apos;s server with provider-side response storage disabled where the provider supports it.
              </li>
              <li>
                <strong className="text-ink">Stored:</strong> runs, reviews and thesis versions live in your browser. The prototype has no
                server database.
              </li>
              <li>
                <strong className="text-ink">Not yet supported:</strong> uploading proprietary models or internal research, customer-hosted
                deployment, and MNPI workflows. Do not enter confidential information in this prototype.
              </li>
            </ul>
            <P>See <A href="/trust">Trust</A> for per-run privacy receipts in the guided demo.</P>
          </section>

          <section className="space-y-3">
            <H2 id="limits">Current limitations</H2>
            <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-ink-2">
              <li>Theses: six demo-authored preset theses. Bringing your own thesis is next on the roadmap.</li>
              <li>Sources: US companies with SEC earnings releases; release text only, no transcript, 10-Q or model files yet.</li>
              <li>Accounts: no login; the Analyst/PM switch is a demo control; runs are per-browser.</li>
              <li>Edits: in the Live Desk you can accept or reject a proposal but not edit its values yet.</li>
              <li>Nothing in Delphi is investment advice.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <H2 id="faq">FAQ</H2>
            <dl className="space-y-3">
              {[
                ["Can the model change our thesis on its own?", "No. Only approved proposals are applied, and only through Apply, which records a new version."],
                ["What if the model makes up a number?", "The proposal is blocked (number_unsupported) and shown in the Blocked panel. It cannot be approved."],
                ["Why did it propose nothing about one of our pillars?", "Either the filing does not move it, which is often correct, or it needs other sources. Check the coverage gaps."],
                ["How long does a run take?", "Usually 40–120 seconds from clicking Analyze."],
                ["Can I undo an applied change?", "The ledger keeps every version. In the guided demo you can roll back the latest transition; the Live Desk will add this."],
              ].map(([q, a]) => (
                <div key={q}>
                  <dt className="text-[13.5px] font-semibold text-ink">{q}</dt>
                  <dd className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{a}</dd>
                </div>
              ))}
            </dl>
            <P>
              Questions or feedback? Tell us what was confusing. Your feedback directly shapes what we build next.
            </P>
          </section>
        </article>
      </div>
    </div>
  );
}

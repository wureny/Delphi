/**
 * Delphi public company website — single responsive page.
 * Same visual identity as the product; explains and markets the workflow.
 * All claims follow the current claims policy: pre-launch prototype, frozen
 * public-source snapshots plus labeled demo-authored context, seeking design partners.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Landmark,
  FileSearch,
  GitCommitHorizontal,
  ShieldCheck,
  Scale,
  TriangleAlert,
  CheckCircle2,
  Layers,
  UserRound,
  Inbox,
  BookOpenCheck,
  Activity,
  CircleHelp,
} from "lucide-react";
import { resolvePublicContactEmail } from "@/lib/public-contact";

export const metadata: Metadata = {
  title: "Delphi | The Decision Layer for Fundamental Investment Teams",
  description:
    "Delphi compares material events against your approved investment view, proposes cited thesis changes, and records only what your team approves.",
};

const CONTACT = resolvePublicContactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL);

function SectionHeading({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <div className="max-w-3xl">
      {eyebrow && <p className="text-[10px] font-semibold tracking-[0.12em] text-accent uppercase">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">{title}</h2>
      {lead && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">{lead}</p>}
    </div>
  );
}

function Screenshot({ src, alt, caption, priority = false }: { src: string; alt: string; caption: string; priority?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-[3px] border border-line-strong bg-panel shadow-[0_14px_50px_rgba(21,32,41,0.08)]">
      {/* Static product screenshots captured from the real prototype. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} />
      <figcaption className="border-t border-line px-3 py-2 text-xs text-ink-2">{caption}</figcaption>
    </figure>
  );
}

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#company", label: "Company" },
  { href: "#contact", label: "Contact" },
];

export default function WebsitePage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-line-strong bg-canvas/95 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4" aria-label="Website">
          <a href="#top" className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-[3px] bg-ink">
              <Landmark size={13} className="text-white" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">Delphi</span>
          </a>
          <div className="hidden items-center gap-4 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[13px] text-ink-2 hover:text-ink">
                {l.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="rounded-sm border border-line-strong bg-panel-2 px-3 py-1.5 text-[13px] text-ink hover:border-accent/50"
            >
              Open the interactive demo
            </Link>
            {CONTACT ? (
              <a
                href={`mailto:${CONTACT}?subject=Delphi%20design-partner%20conversation`}
                className="hidden rounded-sm bg-accent px-3 py-1.5 text-[13px] font-semibold text-canvas hover:bg-accent/85 sm:block"
              >
                Request a demo
              </a>
            ) : null}
          </div>
        </nav>
      </header>

      <main id="top">
        {/* ------------------------------ Hero ------------------------------ */}
        <section className="border-b border-line-strong">
          <div className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[0.98fr_1.12fr] lg:gap-12 lg:py-16">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-medium text-ink-3">
                <span className="h-px w-7 bg-warn" aria-hidden />
                Pre-launch prototype · real public sources + demo-authored thesis · seeking design partners
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-balance text-ink">
                From market events to governed investment decisions.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-2">
                Delphi compares new evidence against your team's approved thesis, identifies what changed, and turns
                only human-approved updates into a point-in-time Decision Ledger.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {CONTACT ? (
                  <a
                    href={`mailto:${CONTACT}?subject=Delphi%20design-partner%20conversation`}
                    className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent/85"
                  >
                    Request a design-partner conversation
                  </a>
                ) : null}
                <a
                  href="#how-it-works"
                  className="flex items-center gap-1.5 rounded-sm border border-line-strong bg-panel px-4 py-2 text-sm text-ink hover:border-accent/50"
                >
                  See the workflow
                  <ArrowRight size={14} aria-hidden />
                </a>
              </div>
              <p className="mt-7 border-l-2 border-line-strong pl-3 text-xs leading-relaxed text-ink-3">
                Models propose. Your team decides. Every approved change keeps its evidence and history.
              </p>
            </div>

            <div className="min-w-0">
              <Screenshot
                src="/screenshots/delta-review.png"
                alt="Delphi Delta Review screen showing a cited thesis delta with accept, edit, reject, escalate, and defer actions"
                caption="Real prototype: a cited Thesis Delta reviewed against an explicitly demo-authored thesis, grounded in labeled official public source snapshots."
                priority
              />
            </div>
          </div>
        </section>

        {/* ---------------------------- Problem ----------------------------- */}
        <section className="border-b border-line py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              title="Your team has more answers than ever, but no formal system for how the view changes."
              lead="After earnings, analysts still reconcile numbers, compare management commentary with the current thesis, update fragmented trackers, brief the PM, and preserve the reasoning manually. A generated report can summarize the event. It cannot tell the institution what it officially believed before, who approved a new view, or how to reconstruct the decision later."
            />
            <div className="mt-10 grid border-y border-line-strong md:grid-cols-3">
              {[
                {
                  icon: <Layers size={17} aria-hidden />,
                  title: "State is fragmented",
                  body: "Thesis, forecasts, risks, and open questions live in different files and conversations.",
                },
                {
                  icon: <Scale size={17} aria-hidden />,
                  title: "AI output is not governed",
                  body: "A confident answer does not have authority to change formal investment state.",
                },
                {
                  icon: <BookOpenCheck size={17} aria-hidden />,
                  title: "Decision history disappears",
                  body: "Months later, teams struggle to recover what evidence was available and why the view changed.",
                },
              ].map((c) => (
                <div key={c.title} className="border-b border-line px-0 py-5 md:border-r md:border-b-0 md:px-5 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                  <span className="text-accent">{c.icon}</span>
                  <h3 className="mt-3 text-[15px] font-semibold">{c.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------- How it works -------------------------- */}
        <section id="how-it-works" className="scroll-mt-16 border-b border-line py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="The first workflow"
              title="Earnings-to-Thesis"
              lead="Delphi does not default to another long report. It creates a small set of cited, reviewable changes to the state your team already approved."
            />
            <ol className="mt-10 grid max-w-5xl border-y border-line-strong sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Detect the event",
                "Reconcile facts and forecasts",
                "Compare against the approved thesis",
                "Propose material deltas",
                "Review and approve",
                "Record the state transition",
              ].map((step, i) => (
                <li key={step} className="flex min-h-20 items-start gap-3 border-b border-line p-4 sm:border-r lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
                  <span className="flex size-6 shrink-0 items-center justify-center border border-line-strong bg-inset font-mono text-xs text-accent tnum">
                    {i + 1}
                  </span>
                  <span className="text-[14px] text-ink">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mx-auto mt-10 max-w-4xl">
              <Screenshot
                src="/screenshots/run-observatory.png"
                alt="Run Observatory showing a deterministic runtime timeline and structured event inspector"
                caption="Runtime observability: bounded agents, deterministic validators, and externally meaningful events. No hidden chain of thought."
              />
            </div>
          </div>
        </section>

        {/* ----------------------------- Product ---------------------------- */}
        <section id="product" className="scroll-mt-16 border-b border-line py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Product"
              title="Review the delta, not the document."
              lead="Every proposal shows what changed, how it differs from the approved view, why it matters, the exact evidence, and what remains unknown. Materiality and confidence stay separate."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <Screenshot
                src="/screenshots/change-inbox.png"
                alt="Change Inbox listing material changes with materiality, evidence health, and required reviewer"
                caption="Change Inbox: material changes awaiting a decision, not a chat box."
              />
              <Screenshot
                src="/screenshots/evidence-drawer.png"
                alt="Evidence drawer showing an exact excerpt with locator, published and observed timestamps"
                caption="Evidence drawer: the exact excerpt, locator, timestamps, and extracted values behind every claim."
              />
              <Screenshot
                src="/screenshots/decision-ledger.png"
                alt="Decision Ledger detail showing a v12 to v13 transition with before/after diff"
                caption="Decision Ledger: the exact v12 → v13 diff, evidence lineage, reviewers, and workflow versions."
              />
              <Screenshot
                src="/screenshots/privacy-receipt.png"
                alt="Privacy receipt showing fixture adapter, no external web access, and canonical write counts"
                caption="Privacy Receipt: a visible record of what each run did with data."
              />
            </div>

            {/* Human control */}
            <div className="mx-auto mt-14 max-w-4xl rounded-md border border-line bg-panel p-6">
              <h3 className="text-center text-xl font-semibold">Flexible AI reasoning. Deterministic state control.</h3>
              <div className="mt-6 grid gap-2 text-center sm:grid-cols-4">
                {[
                  { icon: <Activity size={15} aria-hidden />, label: "Agent inferred" },
                  { icon: <UserRound size={15} aria-hidden />, label: "Analyst confirmed" },
                  { icon: <CheckCircle2 size={15} aria-hidden />, label: "PM approved" },
                  { icon: <BookOpenCheck size={15} aria-hidden />, label: "System recorded" },
                ].map((s, i) => (
                  <div key={s.label} className="relative rounded-sm border border-line bg-inset px-3 py-3">
                    <span className="flex items-center justify-center gap-1.5 text-[13px] text-ink">
                      <span className="text-accent">{s.icon}</span>
                      {s.label}
                    </span>
                    {i < 3 && (
                      <ArrowRight
                        size={13}
                        aria-hidden
                        className="absolute top-1/2 -right-2 hidden -translate-y-1/2 text-ink-3 sm:block"
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-center text-[13px] leading-relaxed text-ink-2">
                Agents receive bounded tasks and tools. Validators check evidence, numbers, references, policy, and
                authorization. Formal state changes only after the required human approves them.
              </p>
            </div>

            {/* Degradation */}
            <div className="mx-auto mt-8 max-w-4xl rounded-md border border-warn/30 bg-warn-dim/30 p-6">
              <h3 className="flex items-center justify-center gap-2 text-center text-lg font-semibold">
                <TriangleAlert size={17} className="text-warn" aria-hidden />
                Honest gaps are better than complete-looking guesses.
              </h3>
              <p className="mt-3 text-center text-[13px] leading-relaxed text-ink-2">
                When a source is missing, numbers conflict, or a model output fails validation, Delphi makes the
                limitation visible. Safe partial results remain available; unsupported sections are blocked or
                escalated, never silently filled in.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------- Security ----------------------------- */}
        <section id="security" className="scroll-mt-16 border-b border-line py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Security"
              title="Designed around the customer trust boundary."
              lead="The target institutional architecture separates a Delphi-managed Control Plane from a customer-owned Data Plane. Research content, thesis, positions, embeddings, credentials, keys, runtime, and model endpoints can remain in the customer environment."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: <UserRound size={16} aria-hidden />, title: "Human-authorized write-back", body: "No canonical state changes without the required reviewer." },
                { icon: <GitCommitHorizontal size={16} aria-hidden />, title: "Versioned model & workflow records", body: "Every transition records workflow, skill, and model versions." },
                { icon: <Layers size={16} aria-hidden />, title: "Data classification & policy routing", body: "Each data class defines allowed model routes, retention, and approvals." },
                { icon: <ShieldCheck size={16} aria-hidden />, title: "Customer-owned deployment direction", body: "BYO data plane is the roadmap target, beyond bring-your-own-key." },
                { icon: <FileSearch size={16} aria-hidden />, title: "Visible Privacy Receipt", body: "Each run shows what was accessed, where it executed, and what was written." },
                { icon: <Inbox size={16} aria-hidden />, title: "Export and deletion path", body: "Institutional trust includes the ability to leave with your data." },
              ].map((c) => (
                <div key={c.title} className="rounded-md border border-line bg-panel p-4">
                  <span className="text-accent">{c.icon}</span>
                  <h3 className="mt-2 text-[14px] font-semibold">{c.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{c.body}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-ink-3">
              Deployment capabilities are staged. The current prototype is a deterministic browser-based demonstration
              using frozen official public snapshots, explicitly demo-authored investment context, and an in-memory graph projection; customer data-plane separation, live model endpoints,
              and graph persistence remain roadmap direction, not certified or deployed capabilities. No compliance
              certifications are claimed.
            </p>
          </div>
        </section>

        {/* ----------------------------- Pilot ------------------------------ */}
        <section className="border-b border-line py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Design partners"
              title="Start with one event, not a platform migration."
              lead="The design-partner sequence is intentionally narrow: a reverse demo of your current workflow, a one-event proof, a 4-8 week shadow pilot, then controlled production."
            />
            <div className="mx-auto mt-8 max-w-3xl rounded-md border border-line bg-panel p-6">
              <h3 className="text-sm font-semibold tracking-widest text-ink-2 uppercase">Pilot scope</h3>
              <ul className="mt-3 grid gap-2 text-[14px] text-ink sm:grid-cols-2">
                {[
                  "10-20 names, one earnings workflow",
                  "Read-only state; no automated trading",
                  "Weekly review with the research team",
                  "Measured citation, numeric, materiality, and review-time outcomes",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 text-center">
                {CONTACT ? (
                  <a
                    href={`mailto:${CONTACT}?subject=Delphi%20design-partner%20workflow`}
                    className="inline-block rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent/85"
                  >
                    Discuss a design-partner workflow
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------- Company ----------------------------- */}
        <section id="company" className="scroll-mt-16 border-b border-line py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Company"
              title="The fund's harness, not the model's harness."
              lead="Models, providers, and agent frameworks will change. A fund's approved thesis, permissions, workflow, decision history, and evaluation data should persist. Delphi is building the governed institutional state that allows stronger models to become useful without becoming an uncontrolled black box."
            />
            <p className="mx-auto mt-6 max-w-2xl text-center text-[13px] leading-relaxed text-ink-2">
              Delphi began with a systems question: how can an investment institution use increasingly capable AI while
              preserving stable research objects, evidence lineage, human authority, and point-in-time history? The
              answer is not another chatbot. It is a governed state machine for investment decisions.
            </p>
          </div>
        </section>

        {/* ------------------------------ FAQ ------------------------------- */}
        <section className="border-b border-line py-16">
          <div className="mx-auto max-w-3xl px-4">
            <SectionHeading eyebrow="FAQ" title="Common questions" />
            <div className="mt-8 space-y-3">
              {[
                {
                  q: "Is Delphi an AI analyst?",
                  a: "Delphi uses models to analyze evidence and propose changes, but it does not replace the analyst's or PM's final judgment. Formal state changes require authorized human review.",
                },
                {
                  q: "Does Delphi make trades?",
                  a: "No. Automated trading and position changes are outside the initial product scope.",
                },
                {
                  q: "Does Delphi replace Bloomberg, FactSet, AlphaSense, or Excel?",
                  a: "No. Delphi is designed to connect existing tools and govern the transition from new evidence to approved investment state.",
                },
                {
                  q: "What makes Delphi different from financial search or AI workflow platforms?",
                  a: "Delphi is centered on canonical investment state, human-authorized state changes, point-in-time decision history, and firm-specific materiality, not only search, generation, or task automation.",
                },
                {
                  q: "What data is used for the public demo?",
                  a: "The default MSFT event uses frozen official public sources. Its pre-event thesis, forecast, and inferred deltas are authored for the demo and are not a real institution's view. A public CalPERS holding and policy appear only as institutional references and do not imply a thesis, recommendation, or endorsement. Browser-local imports never leave the browser or enter the frozen replay.",
                },
                {
                  q: "Does Delphi guarantee better investment performance?",
                  a: "No. Delphi is designed to improve research operations, evidence quality, attention allocation, decision traceability, and institutional memory. It does not promise alpha.",
                },
              ].map((f) => (
                <details key={f.q} className="group rounded-md border border-line bg-panel px-4 py-3">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 text-[14px] font-medium text-ink">
                    {f.q}
                    <CircleHelp size={14} className="shrink-0 text-ink-3 group-open:text-accent" aria-hidden />
                  </summary>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------- Final CTA ---------------------------- */}
        <section id="contact" className="scroll-mt-16 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Make every change in conviction traceable.
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {CONTACT ? (
                <a
                  href={`mailto:${CONTACT}?subject=Delphi%20design-partner%20conversation`}
                  className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent/85"
                >
                  Request a design-partner conversation
                </a>
              ) : null}
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-sm border border-line-strong bg-panel px-4 py-2 text-sm text-ink hover:border-accent/50"
              >
                View the product walkthrough
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
            {CONTACT ? <p className="mt-5 text-[13px] text-ink-3">{CONTACT}</p> : null}
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-ink-3">
          <div className="flex items-center gap-2">
            <Landmark size={13} aria-hidden />
            <span>Delphi | pre-launch prototype</span>
          </div>
          <div className="flex gap-4">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-ink">
                {l.label}
              </a>
            ))}
          </div>
          <p>© 2026 Delphi (public-source, demo-authored demonstration) · Not investment advice.</p>
        </div>
      </footer>
    </div>
  );
}

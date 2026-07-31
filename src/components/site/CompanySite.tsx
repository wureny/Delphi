import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Clock3 } from "lucide-react";
import { resolvePublicContactEmail } from "@/lib/public-contact";
import { Reveal } from "./Reveal";
import { SiteHeader } from "./SiteHeader";
import styles from "./company-site.module.css";

const CONTACT = resolvePublicContactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL);
const CONTACT_HREF = CONTACT
  ? `mailto:${CONTACT}?subject=Delphi%20program%20and%20collaboration%20inquiry`
  : "#contact";

const PRINCIPLES = [
  {
    title: "Delta over document",
    body: "Start with what changed against the approved thesis, not another long summary.",
  },
  {
    title: "Proposal before mutation",
    body: "Models can propose. Authorized people decide what becomes formal state.",
  },
  {
    title: "Point-in-time memory",
    body: "Preserve the evidence, versions, approvals, and uncertainty that existed at the time.",
  },
];

const WORKFLOW = [
  { title: "Observe the event", body: "Load the release, call, forecast, and approved thesis snapshot." },
  { title: "Compare against the view", body: "Reconcile facts and identify material changes, uncertainty, and evidence." },
  { title: "Propose the delta", body: "Create typed changes with a target object and required reviewer." },
  { title: "Review the proposal", body: "Accept, edit, reject, escalate, or defer." },
  { title: "Record the decision", body: "Write only approved changes to a versioned Decision Ledger." },
  { title: "Replay the context", body: "Recover what the team knew, approved, and left unresolved at that time." },
];

const ARCHITECTURE = [
  "Evidence and approved thesis",
  "Bounded analysis",
  "Validated proposal",
  "Human authorization",
  "Decision Ledger",
];

const WORKING_NOW = [
  "Deterministic browser-based review loop",
  "Frozen official MSFT public-source snapshots",
  "Clearly labeled demo-authored thesis context",
  "Role-aware review, Decision Ledger, and Privacy Receipt",
];

const NOT_YET = [
  "Production persistence or authentication",
  "Live customer integrations or live model execution",
  "Customer-owned data plane or compliance certifications",
  "Customer, revenue, or investment-performance claims",
];

const FAQ = [
  {
    question: "Is Delphi an AI analyst?",
    answer:
      "No. Models analyze evidence and propose changes. Authorized analysts and PMs decide what becomes formal investment state.",
  },
  {
    question: "Does Delphi make or execute investment decisions?",
    answer: "No. The prototype does not trade, size positions, or automate final judgment.",
  },
  {
    question: "What is working today, and what remains a roadmap direction?",
    answer:
      "Today: a deterministic browser demo, governed review, and a versioned ledger. Production persistence, authentication, customer integrations, live model endpoints, and customer-owned deployment remain future work.",
  },
  {
    question: "What data does the public demo use?",
    answer:
      "Frozen official Microsoft public sources plus clearly labeled demo-authored thesis and forecast context. It is not a real institution's view.",
  },
];

function SectionIntro({ id, title, body }: { id?: string; title: string; body?: string }) {
  return (
    <div id={id} className={styles.sectionIntro}>
      <h2 id={id ? `${id}-heading` : undefined}>{title}</h2>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

function ProductImage({
  src,
  alt,
  caption,
  priority = false,
}: {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
}) {
  return (
    <figure className={styles.productFigure}>
      <div className={styles.productFrame}>
        <Image
          src={src}
          alt={alt}
          width={2880}
          height={1800}
          priority={priority}
          unoptimized
          sizes="(max-width: 768px) 94vw, (max-width: 1200px) 88vw, 1120px"
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function CompanySite() {
  return (
    <div className={styles.site} data-delphi-site>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <SiteHeader />

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGrid}>
            <Reveal className={styles.heroTitle}>
              <h1 id="hero-title">
                <span>AI can generate an answer.</span>
                <span>Delphi records what the team decides.</span>
              </h1>
            </Reveal>

            <Reveal className={styles.heroCopy} delay={0.08}>
              <p>
                A governed decision layer that turns material evidence into cited, human-approved changes to an
                investment thesis.
              </p>
              <div className={styles.heroActions}>
                <Link href="/demo" className={styles.primaryButton}>
                  Open demo
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <a href={CONTACT_HREF} className={styles.secondaryButton}>
                  Contact Delphi
                </a>
              </div>
            </Reveal>

            <Reveal className={styles.heroVisual} delay={0.16}>
              <ProductImage
                src="/screenshots/delta-review.png"
                alt="Delphi Delta Review showing a cited thesis proposal and human review actions"
                caption="A real prototype screen: evidence-backed changes remain proposals until an authorized person reviews them."
                priority
              />
            </Reveal>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="thesis-heading">
          <div className={styles.container}>
            <Reveal>
              <SectionIntro
                id="thesis"
                title="The missing layer is institutional state."
                body="Research tools help teams find information. Delphi governs what happens next: compare, propose, authorize, and preserve the resulting decision."
              />
            </Reveal>
            <div className={styles.principles}>
              {PRINCIPLES.map((principle, index) => (
                <Reveal key={principle.title} delay={index * 0.06} className={styles.principle}>
                  <h3>{principle.title}</h3>
                  <p>{principle.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.prototypeSection}`} aria-labelledby="prototype-heading">
          <div className={styles.container}>
            <Reveal>
              <SectionIntro
                id="prototype"
                title="A working loop, not a production claim."
                body="The current release is a deterministic browser prototype using frozen official sources and clearly labeled demo-authored thesis context."
              />
            </Reveal>

            <div className={styles.prototypeGallery}>
              <Reveal className={styles.galleryLead}>
                <ProductImage
                  src="/screenshots/change-inbox.png"
                  alt="Delphi Change Inbox prioritizing material changes that need human review"
                  caption="Change Inbox: the product starts with material changes, not a blank chat box."
                />
              </Reveal>
              <Reveal className={styles.galleryLedger} delay={0.06}>
                <ProductImage
                  src="/screenshots/decision-ledger.png"
                  alt="Delphi Decision Ledger showing a versioned before-and-after thesis transition"
                  caption="Decision Ledger: approved changes retain their evidence, reviewers, and before-and-after state."
                />
              </Reveal>
              <Reveal className={styles.galleryReceipt} delay={0.12}>
                <ProductImage
                  src="/screenshots/privacy-receipt.png"
                  alt="Delphi Privacy Receipt showing execution and data-use boundaries"
                  caption="Privacy Receipt: the run exposes what it accessed, executed, and wrote."
                />
              </Reveal>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="workflow-heading">
          <div className={styles.container}>
            <Reveal>
              <SectionIntro id="workflow" title="From evidence to an authorized state transition." />
            </Reveal>
            <div className={styles.workflowRail}>
              {WORKFLOW.map((step, index) => (
                <Reveal key={step.title} className={styles.workflowStep} delay={index * 0.04}>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                  {index < WORKFLOW.length - 1 ? <ArrowRight size={17} aria-hidden /> : null}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.systemSection}`} aria-labelledby="system-heading">
          <div className={styles.container}>
            <Reveal>
              <SectionIntro
                id="system"
                title="Models are replaceable. Institutional state should persist."
                body="Delphi separates short-lived model work from canonical investment objects, policy checks, human authorization, and durable decision history."
              />
            </Reveal>
            <Reveal className={styles.architecturePanel} delay={0.08}>
              <div className={styles.architectureFlow} aria-label="Delphi governed state transition architecture">
                {ARCHITECTURE.map((node, index) => (
                  <div key={node} className={styles.architectureNode}>
                    <span>{node}</span>
                    {index < ARCHITECTURE.length - 1 ? <ArrowRight size={18} aria-hidden /> : null}
                  </div>
                ))}
              </div>
              <p>
                Models propose. Validators constrain. Humans approve. The ledger records.
              </p>
            </Reveal>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="stage-heading">
          <div className={styles.container}>
            <Reveal>
              <SectionIntro
                id="stage"
                title="The prototype proves the contract. Production work remains."
                body="Delphi is early. The public site states what is implemented and what is still only a direction."
              />
            </Reveal>
            <div className={styles.stageGrid}>
              <Reveal className={styles.stageColumn}>
                <div className={styles.stageTitle}>
                  <Check size={18} aria-hidden />
                  <h3>Working today</h3>
                </div>
                <ul>
                  {WORKING_NOW.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Reveal>
              <Reveal className={styles.stageColumn} delay={0.08}>
                <div className={styles.stageTitle}>
                  <Clock3 size={18} aria-hidden />
                  <h3>Not yet claimed</h3>
                </div>
                <ul>
                  {NOT_YET.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="questions-heading">
          <div className={styles.container}>
            <Reveal>
              <SectionIntro id="questions" title="The questions that define the boundary." />
            </Reveal>
            <div className={styles.faqList}>
              {FAQ.map((item) => (
                <details key={item.question} className={styles.faqItem}>
                  <summary>
                    <span>{item.question}</span>
                    <ChevronDown size={18} aria-hidden />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.missionSection}`} aria-labelledby="mission-heading">
          <div className={styles.container}>
            <Reveal className={styles.missionContent}>
              <h2 id="mission-heading">Build the fund&apos;s harness, not the model&apos;s harness.</h2>
              <p>
                Models, providers, and agent frameworks will change. A fund&apos;s approved thesis, permissions,
                workflow, decision history, and evaluation data should persist.
              </p>
              <p>
                Delphi starts with Earnings-to-Thesis because it is frequent, evidence-rich, reviewable, and narrow
                enough to test honestly.
              </p>
            </Reveal>
          </div>
        </section>

        <section id="contact" className={styles.contactSection} aria-labelledby="contact-heading">
          <div className={styles.container}>
            <Reveal className={styles.contactContent}>
              <h2 id="contact-heading">Help test the first workflow.</h2>
              <p>
                Delphi is looking for thoughtful feedback, program support, and design-partner conversations around
                one real earnings workflow.
              </p>
              <div className={styles.contactActions}>
                <a href={CONTACT_HREF} className={styles.primaryButton}>
                  Contact Delphi
                </a>
                <Link href="/demo" className={styles.secondaryButton}>
                  Open demo
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
              {CONTACT ? <a className={styles.emailLink} href={CONTACT_HREF}>{CONTACT}</a> : null}
            </Reveal>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© 2026 Delphi</span>
          <span>Pre-launch research prototype. Not investment advice.</span>
        </div>
      </footer>
    </div>
  );
}

# Delphi v0.2 Package QA Report

**Validation date:** 2026-07-13  
**Scope:** Markdown documents, HTML artifacts, TypeScript contracts, JSON Schema, synthetic fixtures, references, timelines, and core browser interactions.

**Next.js implementation verification:** 2026-07-14 — the runnable repository now supplements the original package
artifact checks below.

---

## 1. Automated structural validation

Command:

```bash
python scripts/validate_package.py
```

Result: **PASS**

Validated:

- every fixture manifest entry exists;
- all JSON fixture files parse;
- all domain fixtures satisfy `schemas/domain.schema.json`;
- source, excerpt, evidence, proposal, run, and transition references resolve;
- successful and degraded RunEvent streams are chronological and fall inside their run lifecycle;
- Thesis v12, expected Thesis v13, and the expected v12 → v13 transition align;
- HTML files have titles, one or more H1 elements, and no duplicate IDs;
- root Markdown documents are non-empty.

## 2. TypeScript contract validation

Command:

```bash
tsc --noEmit --strict --target ES2022 --module ESNext --skipLibCheck schemas/domain-types.ts
```

Result: **PASS**

## 3. Browser interaction smoke test

Command:

```bash
python scripts/interaction_smoke_test.py
```

Result: **PASS**

Tested in headless Chromium at a 1440 × 1000 viewport:

1. documentation portal renders and indexes at least 20 artifacts;
2. prototype opens with four review items;
3. “Load demo reviews” records three approved proposals and one escalation;
4. “Apply approved changes” creates a visible Thesis v12 → v13 Ledger transition;
5. degraded mode replays an explicit `source_unavailable` path;
6. degraded run reports 2 / 3 sources, two safe outputs, and two blocked conclusions;
7. company website and architecture board render without browser page errors.

## 4. Fixture integrity correction completed during QA

The degraded fixture originally reused a successful-run proposal that depended on the missing transcript. This was corrected by creating `fixtures/proposals/degraded-thesis-deltas.json`:

- one revenue-beat proposal uses only the release and team forecast, and preserves attribution as an open question;
- one Q3 forecast-review proposal uses only available evidence;
- transcript-dependent mid-market conclusions remain blocked;
- degraded run output references now point only to proposals whose evidence is available.

This correction is important because Delphi’s central claim is honest degradation rather than plausible completion.

## 5. Visual previews

Generated from the tested HTML files:

```text
previews/portal.png
previews/prototype.png
previews/prototype-ledger.png
previews/prototype-degraded.png
previews/website.png
previews/architecture.png
```

## 6. Runnable application verification (2026-07-14)

Commands:

```bash
export PATH=/opt/homebrew/bin:$PATH
npm test
npm run typecheck
npm run lint
npm run test:e2e
npm run build
openspec validate harden-governed-thesis-workflow --type change --strict --no-interactive
openspec validate surface-fund-context-ingestion --type change --strict --no-interactive
```

Verified result:

- **73 / 73** Vitest unit and fixture-contract tests pass;
- **9 / 9** Chromium E2E scenarios pass: successful review, degraded run, reset, incompatible persisted-state
  rejection, graph debug, fund-context inspection, fund-context narrow-layout behavior, public-to-product navigation,
  and narrow mobile website;
- TypeScript, ESLint, and the Next.js production build pass;
- the production route manifest contains `/debug/context`, `/debug/graph`, and `/website` alongside the governed
  product workflow;
- the v12 → v13 ledger contains a governed `teamConviction: medium → high` diff and no metadata-only transition;
- the graph projection is deterministic, read-only, current-version checked, and every relationship endpoint resolves to
  a stable Delphi node ID;
- the context manifest validates connector/object references, metadata parity, source ACL, point-in-time fields,
  blocked external-model policy for internal context, zero external transfer, and derived graph links;
- the public contact actions resolve to `alixwu2004@gmail.com` and no reserved example destination is rendered.

## 7. Limits of this QA

- Sections 1–5 validate the supplied self-contained package artifacts; Section 6 validates the current Next.js
  implementation. Neither is evidence of a production deployment.
- It does not prove production security, customer VPC deployment, data licensing, or live-model reliability.
- It does not validate investment performance or customer demand.
- Founder, company, IP, traction, funding, and legal facts remain unresolved where marked `[FOUNDER INPUT REQUIRED]`.

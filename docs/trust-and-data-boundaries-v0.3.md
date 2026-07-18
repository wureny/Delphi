# Trust and data boundaries v0.3

## What the public demo contains

- Frozen official public Microsoft Investor Relations pages for FY2025 Q3/Q4 and FY2025 reporting.
- A frozen official SEC Form 13F information-table row disclosing a CalPERS MSFT holding as of 2024-12-31.
- A frozen public CalPERS Total Fund Investment Policy.
- A hypothetical pre-event thesis, forecast, findings, and proposals authored by the Delphi demo team.
- The wholly synthetic ARCT-DEMO fallback scenario.

The CalPERS public artifacts are institutional references only. A disclosed holding does not reveal a private thesis,
recommendation, active decision, or endorsement. Delphi does not claim that CalPERS uses or approves this product.

## Origin labels

| Label | Meaning |
|---|---|
| `real_public` | Content and metadata normalized from the named official public publisher. |
| `demo_derived` | A hypothetical view constructed by the demo authors, sometimes from cited public facts. |
| `synthetic` | A fictional controlled fixture, currently ARCT-DEMO. |
| `user_provided_local` | A file selected and parsed in the evaluator's browser. |

## Local-file behavior

CSV, JSON, TXT, Markdown, and text-based PDFs are parsed in the browser with a 5 MB limit. The store persists only
file metadata, a bounded normalized text preview, warnings, and a SHA-256 hash. Raw bytes are not persisted. The
deterministic run never calls a model and does not analyze newly attached local files; they are labeled excluded.
Reset demo clears local artifacts and restores the curated context set.

## Network and model behavior

The product runtime has no external network access and calls no live model. `npm run verify:sources -- --refresh` is a
developer-only review command and is not imported by application code. Model-route receipts identify the deterministic
fixture adapter, local endpoint ownership, zero retention, and disabled training use.

This is a pre-launch prototype, not a security certification or investment recommendation.

## 1. Lock the semantic-transition contract

- [x] 1.1 Add unit tests that reject a `replace` operation whose parsed value equals the target field's current value and assert that no approval is recorded.
- [x] 1.2 Add gateway tests for a composite approved batch whose operations have no net semantic effect, asserting atomic rejection with no version or transition.
- [x] 1.3 Add a contract assertion that every applied fixture transition contains at least one governed structural diff.

## 2. Enforce meaningful canonical changes

- [x] 2.1 Introduce one canonical semantic-thesis projection used for equality, hashing, and structural ledger diffing while excluding recording metadata.
- [x] 2.2 Extend semantic patch validation with a stable product-safe no-op error for unchanged replacements.
- [x] 2.3 Add a final net-effect guard to the transition gateway before version, approval metadata, snapshots, or ledger transitions are written.
- [x] 2.4 Confirm that rejected, escalated, deferred, blocked, stale, duplicate, and invalid reviews retain existing fail-closed and idempotent behavior.

## 3. Align fixtures, persistence, and ledger output

- [x] 3.1 Set the v12 enterprise-demand conviction to `medium` and retain the proposal value `high` so the increase occurs only through the accepted proposal path, keeping narrative and evidence aligned.
- [x] 3.2 Regenerate the expected v13 thesis, expected ledger transition, hashes, and fixture-contract assertions from the corrected baseline.
- [x] 3.3 Version or migrate the persisted browser-state envelope so incompatible saved state cannot override the corrected fixture baseline.
- [x] 3.4 Update ledger presentation and tests to use the shared semantic projection and remove the metadata-only success path.

## 4. Define backend composition boundaries

- [x] 4.1 Add a typed runtime configuration schema and composition function that selects the deterministic fixture analysis adapter by default.
- [x] 4.2 Add a product-shaped capability descriptor for fixture, configured-live, degraded, projection-only, and unavailable states without serializing secrets or raw vendor errors.
- [x] 4.3 Make missing, incomplete, or unknown live-provider configuration fail closed without network access or a visible live control.
- [x] 4.4 Add a read-only graph projection port with stable product IDs and a deterministic projection-only or unavailable implementation that cannot mutate canonical state.
- [x] 4.5 Add unit tests for adapter selection, invalid configuration, capability reporting, secret non-exposure, graph determinism, stale graph rejection, and canonical-write isolation.

## 5. Keep runtime and trust behavior truthful

- [x] 5.1 Derive run-mode labels and privacy receipts from the selected adapter and current state rather than hard-coded capability claims.
- [x] 5.2 Preserve deterministic successful replay and explicit degraded events, safe partial proposals, blocked evidence-dependent actions, and non-mutating escalation.
- [x] 5.3 Add or update tests for repeatable replay, actual approved-write counts, unavailable capability reporting, and full reset across domain and playback state.

## 6. Harden the public product surface

- [x] 6.1 Replace the reserved contact fallback with validated configuration that hides the contact action when no real destination is available.
- [x] 6.2 Audit public copy and trust surfaces so current fixture behavior and planned live or enterprise architecture are clearly distinguished.
- [x] 6.3 Verify that every rendered primary action reaches the interactive product or a valid configured destination.
- [x] 6.4 Add automated coverage for invalid contact configuration, plus end-to-end coverage for public-to-product navigation, core disclosures, and supported mobile rendering.

## 7. Verify the complete product workflow

- [x] 7.1 Update the successful-review E2E path to assert a meaningful v12 to v13 structural diff and exact inclusion or exclusion of reviewed proposals.
- [x] 7.2 Re-run degraded and reset E2E paths against the corrected fixtures and persistence version.
- [x] 7.3 Run all unit and contract tests, Playwright E2E, typecheck, lint, and production build with the supported Node runtime.
- [x] 7.4 Manually inspect the Change Inbox, Delta Review, Evidence Drawer, Run Observatory, Decision Ledger, Trust Receipt, public website, and narrow mobile layout.
- [x] 7.5 Update the root README and relevant product architecture, trust, and acceptance documentation to match the implemented boundaries and verified behavior.

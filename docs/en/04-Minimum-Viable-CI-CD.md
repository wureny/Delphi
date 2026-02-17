# Delphi Minimum Viable CI/CD (v0.1)

## 1. Goal
Establish the essential quality and delivery gate of a professional team without heavy infrastructure:
1. Every change is automatically checked.
2. Every version can be packaged and traced.

## 2. CI (Continuous Integration)
Workflow: `.github/workflows/ci.yml`

Triggers:
1. `pull_request`
2. `push` to `main`

Checks:
1. Required project docs/templates must exist.
2. Issue template frontmatter must include `name/about/title/labels`.
3. All JSON files must be parseable.
4. If `tests/` exists, run `pytest`.

Local equivalent:
```bash
bash scripts/ci/check_repo.sh
```

## 3. CD (Continuous Delivery)
Workflow: `.github/workflows/release.yml`

Triggers:
1. Manual run (`workflow_dispatch`)
2. Tag push (`v*`, for example `v0.1.0`)

Bundle content:
1. `docs/`
2. `.github/ISSUE_TEMPLATE/`
3. `scripts/ci/`
4. `LICENSE`
5. `ontology/` (if present)

Outputs:
1. `dist/delphi-<version>.tar.gz`
2. `dist/delphi-<version>.sha256`
3. Uploaded Actions artifact
4. Auto GitHub Release for tag-triggered runs

## 4. Why this is Minimum Viable
1. Stability first: prevents structure, process, and JSON regressions.
2. Delivery second: every version has a reproducible package and checksum.
3. Advanced layers (security scan, environment deploy, staged release) can be added later.

## 5. Suggested Next Upgrades
1. Add ontology schema validation (JSON Schema + sample sets).
2. Add branch protection with required status checks.
3. Add automated benchmark pipeline (Raw vs Ontology).

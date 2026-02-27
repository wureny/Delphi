#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[CI] Running repository structure checks..."

required_files=(
  "docs/zh/00-项目总览与执行方式.md"
  "docs/zh/01-PRD-Polymarket-Ontology-v0.1.md"
  "docs/zh/02-任务拆解与里程碑-v0.1.md"
  "docs/zh/03-GitHub-Issue-规范与模板.md"
  "docs/zh/04-CI-CD-最小可行方案.md"
  "docs/en/00-Project-Overview-and-Execution.md"
  "docs/en/01-PRD-Polymarket-Ontology-v0.1.md"
  "docs/en/02-Task-Breakdown-and-Milestones-v0.1.md"
  "docs/en/03-GitHub-Issue-Guidelines-and-Templates.md"
  "docs/en/04-Minimum-Viable-CI-CD.md"
  ".github/ISSUE_TEMPLATE/01-epic-ontology.md"
  ".github/ISSUE_TEMPLATE/02-story-ontology.md"
  ".github/ISSUE_TEMPLATE/03-task-implementation.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "[CI][ERROR] Missing required file: $file"
    exit 1
  fi
done

echo "[CI] Required files check passed."

echo "[CI] Validating GitHub issue templates..."
for tpl in .github/ISSUE_TEMPLATE/*.md; do
  grep -q "^---" "$tpl" || { echo "[CI][ERROR] Missing frontmatter in $tpl"; exit 1; }
  grep -q "^name:" "$tpl" || { echo "[CI][ERROR] Missing 'name' in $tpl"; exit 1; }
  grep -q "^about:" "$tpl" || { echo "[CI][ERROR] Missing 'about' in $tpl"; exit 1; }
  grep -q "^title:" "$tpl" || { echo "[CI][ERROR] Missing 'title' in $tpl"; exit 1; }
  grep -q "^labels:" "$tpl" || { echo "[CI][ERROR] Missing 'labels' in $tpl"; exit 1; }
done

echo "[CI] Issue template check passed."

echo "[CI] Validating JSON files (if any)..."
json_count="$(find . -type f -name '*.json' ! -path './.git/*' | wc -l | tr -d ' ')"
if [[ "$json_count" -eq 0 ]]; then
  echo "[CI] No JSON files found, skipping JSON parse validation."
else
  python3 scripts/ci/validate_json.py
fi

echo "[CI] Running ontology pipeline smoke test..."
python3 scripts/ontology/smoke_test_polymarket_pipeline.py

echo "[CI] Running stream capture replay smoke test..."
python3 scripts/ontology/smoke_test_polymarket_stream_capture.py

echo "[CI] Running case library smoke test..."
python3 scripts/ontology/smoke_test_polymarket_case_library.py

echo "[CI] Running live case label smoke test..."
python3 scripts/ontology/smoke_test_live_case_labels.py

echo "[CI] Running multi-agent context smoke test..."
python3 scripts/ontology/smoke_test_multi_agent_context.py

echo "[CI] Running decision record mapper smoke test..."
python3 scripts/ontology/smoke_test_decision_records.py

echo "[CI] Running risk policy gate smoke test..."
python3 scripts/ontology/smoke_test_risk_policy_gate.py

echo "[CI] Running order proposal smoke test..."
python3 scripts/ontology/smoke_test_order_proposals.py

echo "[CI] Running multi-agent runtime smoke test..."
python3 scripts/ontology/smoke_test_multi_agent_runtime.py

echo "[CI] Running microstructure benchmark..."
python3 scripts/ontology/benchmarks/evaluate_microstructure_cases.py \
  --cases ontology/samples/benchmarks/microstructure-benchmark-cases.json >/dev/null

echo "[CI] All checks passed."

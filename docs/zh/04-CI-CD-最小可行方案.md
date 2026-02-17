# Delphi 最小可行 CI/CD 方案（v0.1）

## 1. 目标
在不引入复杂基础设施的前提下，建立专业团队必备的交付门禁：
1. 每次提交都自动检查核心质量。
2. 每个版本都能自动打包成可追溯交付物。

## 2. CI（持续集成）
工作流文件：`.github/workflows/ci.yml`

触发条件：
1. `pull_request`
2. `push` 到 `main`

检查内容：
1. 仓库关键文档和模板是否缺失。
2. issue 模板 frontmatter 是否完整（`name/about/title/labels`）。
3. 仓库内 JSON 文件是否可解析。
4. 若存在 `tests/`，自动运行 `pytest`。

本地同款命令：
```bash
bash scripts/ci/check_repo.sh
```

## 3. CD（持续交付）
工作流文件：`.github/workflows/release.yml`

触发条件：
1. 手动触发（`workflow_dispatch`）
2. 推送 tag（`v*`，如 `v0.1.0`）

产物内容：
1. `docs/`
2. `.github/ISSUE_TEMPLATE/`
3. `scripts/ci/`
4. `LICENSE`
5. `ontology/`（如果目录存在）

产物输出：
1. `dist/delphi-<version>.tar.gz`
2. `dist/delphi-<version>.sha256`
3. 自动上传 Actions artifact
4. tag 触发时自动创建 GitHub Release

## 4. 为什么这就是“最小可行”
1. 先保证“能稳”：结构、规范、数据格式不回归。
2. 再保证“能发”：每个版本都有自动打包和校验哈希。
3. 复杂能力（安全扫描、部署环境、多阶段发布）后续再加。

## 5. 下一步增强（按优先级）
1. 增加 ontology schema 校验（JSON Schema + 样例集）。
2. 增加 PR 必须通过状态检查（branch protection）。
3. 增加评估流水线（Raw vs Ontology benchmark 自动跑）。

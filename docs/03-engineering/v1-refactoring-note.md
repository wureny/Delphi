# Delphi v1 Refactoring Note

> 本文档基于对 Delphi 全量代码的深度审计，结合产品视角和 AI 工程视角，给出系统性重构方案。供 CTO agent 拆分工单使用。

## Status Snapshot (2026-03-24)

- 已落地：真实 `GraphContextReader` 注入 runtime，并在 provider executors 调模型前读取 run/case graph context。
- 已落地：skill registry 从纯声明升级为最小可执行 dispatch layer，runtime executors 已经通过 registry 分发主 skill。
- 已落地：项目内已 vendoring 投资分析 skill playbooks，并将其 prompt guidance 接入 provider agents，用于 thesis/liquidity/market-signal/judge 的实际分析。
- 已落地：provider prompts 已增加更明确的 memo-style coverage contract，固定 6 sections 仍保留，但内容目标已从“简短总结”提升为“可执行投资备忘录”。
- 已落地：固定 6 sections 的 `report_section_ready` 流式发布，前端已支持逐段渲染。
- 已落地：OpenAI provider 已接入真实 section-level streaming；Judge 现在会随着模型输出逐段发出 `report_section_ready`，不再等完整 JSON 生成后一次性批量发出。
- 已落地：左侧问答区已砍掉装饰性 header/sidebar，收敛为 chat-first 主布局；assistant 响应按 memo sections 内联呈现，并支持轻量 markdown 和 typing indicator。
- 已落地：第一版 `research-map` snapshot API 和前端 `Research Map` 面板，但当前是**面向用户解释的派生视图**，不是完整 raw graph visualization。
- 已落地：第一版 `graph-snapshot` API 和右侧 `Research Structure` tab，可把当前 case、report sections、findings、structured objects、evidence refs 以产品化方式展示出来，并与左侧报告做最小联动高亮。
- 已落地：Judge 默认会把当前 run 的综合结论持久化为 stable `Judgment`，并在 Neo4j 图上复用 `HAS_JUDGMENT` / `SUPPORTED_BY` 关系。
- 已落地：Neo4j context reader 现在除了 run/case 摘要，还会读取历史 `Judgment` 与 case 级反向证据摘要，供 provider agents 在 prompt 中使用。
- 尚未落地：dynamic report sections、raw graph explorer / force layout 可视化。

---

## 0. 现状诊断：三个核心断裂

在深入代码后，当前 v0 存在三个根本性的"设计-实现断裂"：

| # | 设计文档说的 | 代码实际做的 | 后果 |
|---|------------|------------|------|
| 1 | "Agents leverage ontology and context graph for reasoning" | 图谱是 **write-only**——`GraphContextReader` 接口存在但永远是 `null`，Agent 从不读图 | Ontology 退化为审计日志，不是决策引擎 |
| 2 | "Dynamic skill dispatch with registry" | Skills 是纯元数据声明（`registry.ts`），Agent 执行路径完全硬编码在 `provider-executors.ts` | Skill 系统是空壳 |
| 3 | "Structured, traceable, updatable investment case" | 报告是一次性 LLM 输出（6 固定段落），无流式、无动态结构、无图谱联动 | 用户体验 = 等 60s → 一坨文字出现 |

**重构目标**：让这三个断裂闭合——图谱参与决策、Skills 真正执行、输出真正流式且与图谱联动。

---

## 1. Thread A — 后端重构：让 Ontology 和 Context Graph 真正工作

### 1.1 实现 GraphContextReader（最高优先级）

**现状**：`src/orchestration/agent-runtime.ts:66-69` 定义了 `GraphContextReader` 接口（`getRunContext()`, `getCaseContext()`），但 orchestrator.ts 中 `this.graphContextReader = options.graphContextReader ?? null`，从不传入真实实现。

**改动**：

```
新建: src/research-graph/neo4j-context-reader.ts
修改: src/orchestration/orchestrator.ts — 注入真实 reader
修改: src/orchestration/provider-executors.ts — 每个 executor 在调用 LLM 前先读图
```

**Reader 应支持的查询**：
- `getCaseContext(caseId)` → 返回当前 case 下所有 Thesis/Risk/Evidence/Signal 的摘要
- `getRunContext(runId)` → 返回当前 run 的 task 状态和已有 findings
- `getPriorJudgments(caseId)` → 返回历史 Judgment 节点（为未来多轮演化预留）
- `getContradictions(caseId, claim)` → 返回与某个 claim 相矛盾的 evidence

**Agent 如何使用**：
- Thesis Agent：先查已有 Thesis 节点，避免重复生成，聚焦增量信息
- Liquidity Agent：查 LiquidityRegime 历史，检测 regime 变迁
- Market Signal Agent：查已有 MarketSignal，检测信号翻转
- Judge Agent：查所有上游 stable objects + 历史 Judgment，做 conviction shift 检测

### 1.2 激活 Skill 系统

**现状**：`registry.ts` 定义了 4 个 SkillDefinition + 5 个 ToolDefinition，但 executor 从不查询 registry。每个 Agent 的执行逻辑硬编码在对应的 `ProviderXxxExecutor` 类中。

**改动方向**：

```
修改: src/orchestration/registry.ts — Skill 从声明式变为可执行
修改: src/orchestration/provider-executors.ts — Executor 通过 registry dispatch skill
新建: src/orchestration/skill-executors/ — 每个 skill 独立文件
```

**核心改动**：
- `SkillDefinition` 增加 `execute(context, input) → output` 方法
- `ProviderThesisExecutor.execute()` 不再直接包含全部逻辑，而是：
  1. 从 `skillRegistry.listForAgent("thesis")` 获取可用 skills
  2. 按 skill 逐个执行（`thesis_analysis` skill 负责 LLM 调用 + finding 生成）
  3. 聚合 skill 输出为 agent 结果
- 这为后续增加新 skill（如 `earnings_analysis`, `insider_trading_analysis`）提供扩展点

### 1.3 Graph 写入增强：Evidence Lineage

**现状**：Agent 创建 finding 后生成 graph patch，但 evidence 链路不完整——finding 引用 `evidenceRefs` 是字符串数组，不是真正的图关系。

**改动**：
- 每个 Finding 写入时，自动创建 `Finding -[:BASED_ON]-> Evidence` 边
- 每个 Decision 写入时，自动创建 `Decision -[:CONSIDERS]-> Finding` 边
- Report section 写入时，创建 `ReportSection -[:CITES]-> Finding` 边（当前部分已有）

这使得从最终报告到原始数据的完整溯源链路在图谱中可查。

---

## 2. Thread B — 输出重构：流式、灵活结构、图谱联动

### 2.1 流式报告输出（核心体验升级）

**现状**：
- 报告内容通过 `GET /runs/{id}/report` 批量返回，前端在 `report_ready` 事件后一次性渲染
- 用户体验：等 60-120s → 六段文字同时出现
- Terminal 输出也限死 9 行（`MAX_RENDERED_TERMINAL_LINES = 9`），`overflow: hidden`

**改动**：

**后端**：
```
修改: src/orchestration/events.ts — 新增 report_section_delta 事件类型
修改: src/orchestration/provider-executors.ts — Judge 分段输出
修改: src/orchestration/runtime-api.ts — events SSE 流中穿插 section delta
```

**方案选择**：

| 方案 | 描述 | 推荐 |
|------|------|------|
| A. Section-level streaming | Judge 每完成一个 section 就推送，6 次推送 | ✅ 推荐 v1 |
| B. Token-level streaming | OpenAI streaming API + 前端逐字渲染 | v2，需要改 model provider |
| C. Hybrid | Section 级别推送 + 每个 section 内逐字展开动画 | 最佳体验，但复杂度高 |

**v1 推荐方案 A**：
1. Judge executor 改为分 section 调用 LLM（或单次调用后分段 emit）
2. 每完成一个 section，通过 event sink 发送 `report_section_ready` 事件
3. 事件包含 `{ sectionKey, content, citations, status }`
4. 前端收到后立即渲染对应 section card

### 2.2 结构化但不固定死

**现状**：报告固定 6 段（`final_judgment`, `core_thesis`, `supporting_evidence`, `key_risks`, `liquidity_context`, `what_changes_the_view`），硬编码在 JSON Schema 中。

**问题**：
- 不同类型的问题（buy decision vs risk check vs event-driven）应该有不同的报告结构
- 有些问题可能不需要 liquidity_context，有些可能需要 valuation_analysis

**改动方向**：
```
修改: src/orchestration/contracts.ts — ReportSection 改为动态列表
修改: src/orchestration/provider-executors.ts — Judge 根据 caseType 动态决定 sections
修改: src/orchestration/report.ts — 支持变长 section 列表
```

**方案**：
- 定义 section 池（10-15 个可选 section types）
- Judge 的 LLM prompt 包含 caseType → 让 LLM 选择 5-8 个最相关的 sections
- 保留 `final_judgment` 为必选，其余动态
- 前端 report grid 适配 N 个 section cards（不再假设恰好 6 个）

**Section 池（建议）**：
```
必选: final_judgment
核心: core_thesis, key_risks
条件: supporting_evidence, liquidity_context, what_changes_the_view,
      valuation_analysis, catalyst_timeline, earnings_quality,
      competitive_positioning, sentiment_analysis, technical_setup
```

### 2.3 图谱可视化联动

**现状**：知识图谱对用户完全不可见。用户无法看到 Investment Case 的结构。

**改动**：

```
新建: frontend/src/graph-view.ts — 轻量图谱渲染组件
修改: src/orchestration/runtime-api.ts — 新增 GET /runs/{id}/graph-snapshot 端点
修改: frontend/src/app.ts — 集成图谱视图
```

**方案**：
- 后端新增 API：`GET /runs/{runKey}/graph-snapshot` 返回当前 case 的图谱快照（nodes + edges JSON）
- 前端用 **Canvas 2D 或 lightweight SVG** 渲染（不引入 D3 这种重依赖，保持 zero-dependency 原则）
- 图谱展示位置：右侧面板的一个新 tab（与 Agent Terminals 并列）
- 交互：
  - 节点按类型着色（Thesis=蓝, Risk=红, Evidence=灰, Signal=绿）
  - 点击节点高亮对应的报告段落
  - 点击报告段落高亮对应的图谱节点
  - Agent 执行时实时增加节点（通过 graph patch 事件驱动）

**视觉风格**：
- 暗色背景 + 发光节点（符合当前科技感风格）
- Force-directed layout 或 hierarchical layout（InvestmentCase 在中心）
- 动画：新节点淡入，新边滑入

---

## 3. Thread C — 前端 UI 重构

### 3.1 左侧面板极简化

**现状问题**：
- 初始状态就有 system message、status strip、composer note 等大量元素
- 用户一进来就被信息淹没

**改动**：

```
修改: frontend/src/render.ts — 重写 chat shell 渲染
修改: frontend/src/state.ts — 简化初始状态
修改: frontend/styles.css — 重新设计 chat 区域
```

**新设计**：

**初始态（idle）**：
```
┌──────────────────────────────────┐
│                                  │
│                                  │
│         (极简居中布局)             │
│                                  │
│    "Ask about any US stock"      │
│    ┌─────────────────────────┐   │
│    │ e.g. Is NVDA a buy?    │   │
│    └─────────────────────────┘   │
│              [Submit]            │
│                                  │
│                                  │
└──────────────────────────────────┘
```

- 无 system message、无 status strip、无 sidebar nav
- 只有一个居中的输入框 + 微妙的 placeholder + submit 按钮
- 参考 ChatGPT / Perplexity 的初始态设计

**运行态（running → completed）**：
- 输入框收缩到顶部
- 报告 sections 逐个流式出现（Section-level streaming）
- 状态信息降权为底部小字或顶部 badge
- 右侧 canvas 自动展开

### 3.2 右侧终端：可滚动 + 可展开

**现状问题**：
- `terminal-lines` 设置了 `overflow: hidden` + `mask-image` fade-out
- 最多渲染 9 行（`MAX_RENDERED_TERMINAL_LINES = 9`）
- 用户无法回看之前的 Agent 输出

**改动**：

```
修改: frontend/src/app.ts — 移除 MAX_RENDERED_TERMINAL_LINES 限制
修改: frontend/src/render.ts — terminal card 支持展开态
修改: frontend/styles.css — overflow:auto + 滚动样式
```

**方案**：
- **默认态**：保持紧凑（~12行可见），但改 `overflow: hidden` → `overflow-y: auto`，允许用户手动上滚
- **展开态**：点击终端卡片标题栏，该卡片展开为全高（其他卡片收缩），显示完整历史
- 自动滚动逻辑：新行到达时自动滚底，但如果用户手动上滚过，暂停自动滚动
- 保留 mask fade-out 效果但只在默认态使用

### 3.3 右侧面板：Terminals + Graph 双 Tab

**新布局**：
```
┌─────────────────────────────────────┐
│  [Agents]  [Graph]   (tab bar)      │
├─────────────────────────────────────┤
│                                     │
│  (Agents tab: 4 terminal cards)     │
│  (Graph tab: interactive graph viz) │
│                                     │
└─────────────────────────────────────┘
```

- Agents tab = 当前 4 个终端卡片（修复滚动问题后）
- Graph tab = Investment Case 图谱可视化
- Tab 切换不丢失状态

---

## 4. Thread D — 基础设施改进（支撑重构）

### 4.1 后端 API 增强

```
新增端点:
  GET  /runs/{runKey}/graph-snapshot    → 图谱快照 JSON

修改端点:
  GET  /runs/{runKey}/events           → 新增 report_section_ready 事件类型
```

### 4.2 新增事件类型

```typescript
// 新增到 src/orchestration/events.ts
type RunEventType =
  | ... // existing
  | "report_section_ready"    // Judge 完成一个 section
  | "graph_context_loaded"    // Agent 读取了图谱上下文
  | "skill_dispatched"        // Skill 被 registry dispatch
  | "conviction_shift"        // Judge 检测到与历史判断的偏离
```

### 4.3 Model Provider 增强

```
修改: src/orchestration/model-provider.ts
  — 支持 streaming mode (为后续 token-level streaming 预留)
  — generateObject 支持 partial callback
```

---

## 5. 优先级排序与依赖关系

```
Phase 1 (基础能力)
├── 1a. 实现 Neo4jContextReader          [Thread A, 无依赖]
├── 1b. 左侧面板极简化                    [Thread C, 无依赖]
├── 1c. 右侧终端滚动修复                  [Thread C, 无依赖]
│
Phase 2 (核心体验)
├── 2a. Agent 注入 graph context → LLM    [Thread A, 依赖 1a]
├── 2b. Section-level 流式输出            [Thread B, 无依赖]
├── 2c. 报告结构动态化                    [Thread B, 可与 2b 并行]
│
Phase 3 (差异化)
├── 3a. Skill 系统激活                    [Thread A, 依赖 2a]
├── 3b. 图谱可视化                        [Thread B+C, 依赖 1a]
├── 3c. 报告 ↔ 图谱交互联动               [Thread C, 依赖 3b]
│
Phase 4 (打磨)
├── 4a. Evidence lineage 完善             [Thread A]
├── 4b. Token-level streaming             [Thread B, 依赖 2b]
└── 4c. Graph 实时动画                    [Thread C, 依赖 3b]
```

---

## 6. 关键文件索引

| 文件 | 当前职责 | 重构涉及 |
|------|---------|---------|
| `src/orchestration/orchestrator.ts` | 主编排流程 | 注入 GraphContextReader, 改流式输出 |
| `src/orchestration/provider-executors.ts` | 4 个 Agent 的 LLM 执行逻辑 | 读图谱上下文, skill dispatch, 分段输出 |
| `src/orchestration/registry.ts` | Tool/Skill 元数据声明 | Skill 变为可执行 |
| `src/orchestration/events.ts` | 17 种事件定义 | 新增 4 种事件类型 |
| `src/orchestration/contracts.ts` | 核心接口 | ReportSection 动态化 |
| `src/orchestration/runtime-api.ts` | HTTP API | 新增 graph-snapshot 端点 |
| `src/orchestration/report.ts` | 报告组装 | 支持变长 sections |
| `src/research-graph/neo4j-adapter.ts` | Cypher 语句生成 | 新增查询能力 |
| `src/research-graph/ontology.ts` | 节点/边定义 | 可能需要新增节点类型 |
| `frontend/src/render.ts` | HTML 渲染 | 重写 chat shell, 支持 graph tab |
| `frontend/src/state.ts` | 状态管理 | 简化初始态, 增加 graph state |
| `frontend/src/app.ts` | 主控制器 | 滚动修复, tab 切换, section streaming |
| `frontend/styles.css` | 样式 | 极简化 + 滚动 + graph 视图样式 |

---

## 7. 风险提醒

1. **不要同时铺开所有 Thread** — Phase 1 的三项可以并行，但 Phase 2/3 有依赖关系
2. **保持 fixture 模式可用** — 每个新增能力都要有 fixture fallback，否则开发效率归零
3. **图谱查询性能** — Neo4j 查询如果太慢会拖慢整个 Agent 执行，需要做 timeout + 缓存
4. **前端框架选择** — 如果重构量大，考虑引入 Preact（3KB，兼容 React API）替代字符串拼接，但这是可选的
5. **测试必须同步建立** — 重构无测试 = 灾难，建议每个 Phase 完成前补对应模块的测试

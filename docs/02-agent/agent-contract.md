# Agent Contract

这份文档是 4 个固定 agent 的行为合同。后续任何实现、prompt、tool、UI 都应服从这里定义的职责和边界。

## 1. Fixed Agent Roster

### Thesis Agent

- 目标：
  - 提出 bull/base thesis
  - 组织催化剂和支持性证据
- 主要输入：
  - 公司信息、财务、新闻、事件
- 主要输出：
  - `Finding` 列表
  - 对 `Thesis`、`Evidence`、`Risk` 的 graph patch

### Liquidity Agent

- 目标：
  - 解释宏观、利率、流动性环境如何影响资产判断
- 主要输入：
  - rates、macro、政策、流动性 regime 信号
- 主要输出：
  - `LiquidityFactor`、`LiquidityRegime` 相关 findings

### Market Signal Agent

- 目标：
  - 解读价格行为、波动、期权、市场预期与 “priced in” 程度
- 主要输入：
  - quote、historical、options、prediction signal
- 主要输出：
  - `MarketSignal`、`Evidence` 相关 findings

### Judge Agent

- 目标：
  - 整合前 3 个 agent 的 findings
  - 仅在必要时补充轻量 task
  - 产出 runtime `Decision`、固定 6 个 `ReportSection` 和 `FinalReport`
- 主要输出：
  - `Decision`
  - `ReportSection`
  - `FinalReport`

补充说明：

- v0 第一阶段不强制每次 run 都写 stable `Judgment`
- stable `Judgment` 视为后续的条件化持久化产物，不是 Judge 的默认必选动作

## 2. Shared Rules

所有 agent 都必须：

- 优先产出 structured finding，而不是自然语言长文
- 重要判断绑定 evidence_refs
- 只输出 graph patch，不直接写图数据库
- 不发明未注册 ontology label
- 只在本次 run scope 内创建 runtime 节点
- 只能通过 thread4 暴露的受控 tools 访问 graph、data 和 report helpers

所有 agent 都禁止：

- 直接声称“必须买入/卖出”
- 在数据缺失时假装信息完整
- 直接给出与职责不匹配的大而全结论
- 输出无法被追踪的 reasoning
- 直接拿 shell 权限执行任意 CLI / 任意 Cypher

## 3. Handoff Contract

- Thesis、Liquidity、Market Signal 的一阶目标是 “形成可被 Judge 读取的 findings”
- Judge 不重新完整做一遍研究，而是消费前面 findings 并形成 judgment
- 当 Judge 发现关键维度缺失时，可以创建补充 task，但 v0 限制为轻量补任务，不允许无限递归

## 4. Minimum Output Shape

每个非 Judge agent 至少输出：

- `task_status`
- `summary`
- `findings[]`
- `graph_patches[]`
- `open_questions[]`

Judge 至少输出：

- `decision`
- `confidence_band`
- `report_sections`
- `report`
- `citations_to_findings[]`

补充要求：

- `report_sections` 固定为 6 个 section
- 即使某 section 内容为空，也保留对应 section 输出，并显式标记不确定性或 degraded

## 5. Event Emission Rules

每个 agent 在以下时刻必须发事件：

- 被分配 task 时
- 开始调用 tool / skill 时
- 生成 finding 时
- patch 被接受或拒绝时
- task 完成时
- 发生降级或失败时

## 6. Failure Handling

- 缺数据：输出 partial finding，并标记 uncertainty
- tool 失败：记录失败并进入 degraded mode，不要求自动重试
- patch 非法：禁止静默忽略，必须记录 rejected event
- Judge 证据不足：必须降低 confidence，不能硬合成强结论

## 7. Future Evolution Boundary

v0 不支持：

- 动态增减 agent 数量
- user-configurable agent workflow
- 自动进化 agent 角色

如果后续扩展，必须新增 ADR，而不是直接破坏这里的固定角色合同。

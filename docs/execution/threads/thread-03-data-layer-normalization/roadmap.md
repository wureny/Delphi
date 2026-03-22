# Thread 03 Roadmap

## Goal

把 Delphi v0 的数据层推进到“Railway runtime 可以稳定调用真实市场数据”的状态，而不是做一个大而全的数据平台。

thread3 当前阶段的目标固定为：

- 保持 thread4 现有 orchestration / executors / event stream 不重写
- 通过 HTTP 调用外部 `OpenBB` API 服务
- 交付一个真实可用的 `RuntimeDataAdapter`
- 固定 `provider payload -> raw snapshot -> normalized snapshot -> evidence-ready candidate` 映射链
- 保持 ontology support mapping 清楚且不泄漏 provider-specific raw fields
- 在字段缺失、provider 波动、缓存回退时仍返回可消费 snapshot，并显式 degraded

一句话任务定义：

`Deliver a minimal real RuntimeDataAdapter plus evidence-ready normalization for Railway runtime, not a broad data platform.`

## Scope

- thread3 负责：
  - 外部 provider 接入
  - provider payload -> raw snapshot -> normalized snapshot -> evidence-ready candidate
  - `RuntimeDataAdapter` contract 对齐
  - refresh / cache / degraded 语义
  - 对 thread4 暴露稳定内部 shape
  - ontology support mapping 定义
  - raw snapshot / normalized bundle 的最小保留策略
- thread3 不负责：
  - 改 thread4 的 run / task / event / report 语义
  - 直接写 Neo4j ontology objects
  - 让 runtime / graph 直接消费 provider raw payload
  - 把 thread3 扩成重 ETL / streaming / warehouse 平台

## Product Understanding

- Delphi v0 的目标不是展示行情，而是组织成结构化 investment case。
- 用户最终消费的是 research process、findings、report、graph lineage，不是 OpenBB 原始字段。
- 因此 thread3 的价值不在“接更多源”，而在于给 runtime 和 graph patch 层提供稳定、可解释、可降级的数据接缝。

## Technical Understanding

- OpenBB 在 v0 中的正确形态是“外部 API 服务”，不是开发者本机依赖，也不是 MCP 主接入。
- Delphi backend 通过 HTTP 调用 OpenBB；Railway runtime 也应沿用同一接法。
- provider secrets 只应存在于 backend / OpenBB 服务环境变量中，不应下沉到 runtime contract。
- thread4 已有最小 runtime 骨架，当前已能通过 `RuntimeDataAdapter` 切换 fixture / openbb path。
- thread2 / graph 侧需要的是 evidence-ready candidate 和稳定 ontology support mapping，而不是 provider-specific 字段。

## Deployment Shape

- OpenBB 运行在外部服务中
- Delphi backend 通过 `OPENBB_BASE_URL` 使用 HTTP 调用
- Railway runtime 不依赖开发者本机上的 OpenBB
- Railway runtime 不依赖 Railway 临时文件系统作为正式 persistence
- provider secrets 只放在 OpenBB 服务或 backend 环境变量
- 当前文件系统 artifacts store 只适合本地开发 / staging / demo，不视为正式完成

## Locked Constraints

- 不扩 `RuntimeDataAdapter` 接口来追求更理想 shape
- 继续对 thread4 当前 4 个 snapshot 方法负责
- 只做一层 normalization，不做重 ETL
- raw payload 可以保留在 raw snapshot 层，但不能泄漏到 runtime / graph contract
- stale fallback 允许，但必须显式标记 degraded
- fixture path 保留，真实 adapter 和 fixture adapter 必须可切换

## Data Mapping Chain

thread3 固定维护这条链：

1. `provider payload`
2. `raw snapshot`
3. `normalized snapshot`
4. `evidence-ready candidate`
5. `GraphPatch` 中的 `Evidence` / stable ontology object 消费

纪律：

- `provider payload`
  - 只允许存在于 provider/raw 层
- `raw snapshot`
  - 保留抓取时刻、provider、请求参数和原始 payload
- `normalized snapshot`
  - 给 thread4 runtime 直接消费
  - 不暴露 provider-specific raw fields
- `evidence-ready candidate`
  - 给 thread4 / thread2 稳定转换成 `Evidence`
  - 不等于直接写图
- thread3 不直接写 Neo4j
- 真正写图仍走 `thread4 -> thread2 -> GraphPatch`

## Ontology Support Mapping

- `company info / news / filings`
  - 先进入 `Evidence`
  - 最终支持：
    - `Thesis`
    - `Risk`
- `macro / rates / liquidity`
  - 先进入 `Evidence`
  - 最终支持：
    - `MacroActorAction`
    - `LiquidityFactor`
    - `LiquidityRegime`
- `quote / historical / signals`
  - 先进入 `Evidence`
  - 最终支持：
    - `MarketSignal`

## Refresh And Cache Policy

### Query-Triggered + Short Cache

- `company info`
- `news`
- `latest quote`
- `market signals`

规则：

- query 到来时优先拉取或补拉
- 命中短缓存时可直接返回缓存结果
- 刷新失败但存在 stale 结果时允许降级继续，且必须显式 degraded

### Query-Triggered + Daily Refresh

- `filings`
- `macro / rates / liquidity`

规则：

- query 时检查缓存
- 日级缓存过期时刷新
- 刷新失败但存在上一版 snapshot 时允许 stale fallback，并显式 degraded

### Degraded Allowed

- 新闻不足但仍有 company / market 主数据
- 单个 quote 指标缺失但仍能形成 market snapshot
- 宏观字段部分缺失但仍能给出 `regimeLabel` / `ratesSummary`
- filings 暂时拿不到，但 company info / news 仍可支持基础 thesis / risk 分析

### Degraded Not Allowed

- ticker 无法解析且拿不到任何 company / market 主数据
- normalization 失败到无法形成任何可消费 summary
- 4 个 snapshot 方法持续返回不可消费空结构

## Current Status

### Done

- 已实现最小真实 `OpenBBRuntimeDataAdapter`
- 已覆盖 thread4 当前 4 个 snapshot 方法：
  - `getCompanySnapshot(ticker, runId)`
  - `getNewsSnapshot(ticker, runId)`
  - `getMarketSnapshot(ticker, runId)`
  - `getMacroLiquiditySnapshot(runId)`
- 已实现最小 `provider payload -> raw snapshot -> normalized snapshot -> evidence-ready candidate` 链
- 已固定 ontology support mapping，并对齐 thread4 / thread2 消费边界
- 已保留 fixture path，且 demo runner 可切换 fixture / openbb
- 已有最小 artifacts persistence：
  - 当前为本地文件 store
  - 仅作为本地开发 / staging / demo 方案
- 已在本地开发环境验证：
  - `openbb:smoke`
  - `runtime:demo:openbb`

### In Progress

- 把 thread3 文档和部署假设统一到“外部 OpenBB API 服务”模式
- 把当前本地 artifacts persistence 明确标记为非正式生产 persistence
- 为后续 Railway backend / remote OpenBB 部署收紧环境变量和 setup 说明

### Not Started

- Supabase / Postgres 级正式 snapshot persistence
- Railway 环境下的真实 OpenBB 联调验证
- raw snapshot / normalized bundle 的正式持久化 schema
- 更强的 replay / readback / operational tooling

## Main Design Judgment

thread3 当前阶段最重要的不是继续补抽象，而是把“外部 OpenBB 服务 -> normalized snapshot -> evidence-ready candidate”这条链稳定下来，让 Railway runtime 能直接跑真实数据。

原因：

- thread4 已经通过 adapter 抽象读取数据，不需要再发明新 contract
- thread2 / graph 需要的是稳定 evidence input，而不是 provider-specific chaos
- 如果继续把 OpenBB 绑定在开发者本机，部署时就会重新断链
- 如果把本地文件 store 假装成正式 persistence，会直接误导后续部署设计

## Phase Plan

### Phase 1: Minimal Real Adapter

状态：已完成

- 外部 OpenBB HTTP client
- 4 个最小 snapshot 方法
- 最小 normalization
- 最小 evidence-ready candidate 输出
- fixture / openbb path 切换

### Phase 2: Evidence-Ready Consumption

状态：已完成最小接缝

- thread3 已提供 evidence-ready candidate
- thread4 / thread2 已能基于该形态继续走 `Evidence` / stable object patch
- thread3 继续保持 provider raw fields 不外泄

### Phase 3: Externalized Deployment Hardening

状态：当前阶段

- 把 OpenBB 默认部署形态固定为外部 API 服务
- 对齐 Railway backend 环境变量和调用方式
- 明确本地文件 store 仅是 dev / staging / demo 方案
- 不把临时文件 persistence 误记为正式交付

### Phase 4: Formal Persistence

状态：未开始

- 为 raw snapshot / normalized bundle / evidence-ready artifact 设计正式 persistence
- 优先 Supabase / Postgres，而不是 Railway 临时文件系统
- 保持 persistence failure 不污染 runtime contract

## Risks And Pitfalls

- 把 OpenBB 继续视为本机依赖，导致 Railway 部署断链
- 把 provider secrets 放进错误层级，污染 backend/runtime 合同
- 把本地文件 store 当成正式 persistence，误导后续架构判断
- 为 provider 完整性改 thread4 contract，直接拖慢联调
- 把 provider-specific raw fields 泄漏给 runtime / graph
- 不显式 degraded，导致缓存回退和真实失败语义混乱

## Acceptance Criteria

- Railway backend 可通过 HTTP 调用真实 OpenBB adapter
- thread4 的 runtime 能在 openbb 模式下跑通
- normalized snapshot 不泄漏 provider-specific raw fields
- evidence-ready candidate 可供 graph patch 层消费
- refresh policy 与当前 contract 一致：
  - quote / news / company info：query-triggered + short cache
  - filings / macro / liquidity：query-triggered + daily refresh
- stale fallback 允许，但必须显式 degraded
- 本地文件 artifacts store 被明确标记为 dev / staging / demo 方案，而不是正式生产 persistence

## Immediate Next Step

thread3 下一步优先做正式 persistence 方向的收敛：

- 明确 Supabase / Postgres 的最小 artifact persistence 方案
- 保持外部 OpenBB 服务接入不变
- 不再扩 runtime contract
- 不把 Railway 临时文件系统当作正式落盘目标

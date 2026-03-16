# Delphi v0 Task Backlog

这份文档只关心任务，不关心具体时间。
目标是给后续 multi-thread agents 一个清晰、低歧义的执行清单。

## Usage Rules

- 每个任务都应能被一个 agent 独立拿走。
- 每个任务都应有明确输入文档和完成标准。
- 如果某任务需要做产品判断或改边界，先更新相关 canonical docs，再继续实现。

## P0: Foundation Lock

### T1. Tighten project framing

- Goal:
  - 把 [project-brief.md](/Users/wurenyu/workspace/Delphi/docs/00-project/project-brief.md) 收敛成更精确的 v0 framing
- Input docs:
  - [project-brief.md](/Users/wurenyu/workspace/Delphi/docs/00-project/project-brief.md)
  - [pr-faq.md](/Users/wurenyu/workspace/Delphi/docs/00-project/pr-faq.md)
- Done when:
  - 项目定位、目标用户、v0 边界没有明显冲突

### T2. Tighten technical framing

- Goal:
  - 把 [technical-notes.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/technical-notes.md) 中的核心技术方案收敛成稳定叙事
- Input docs:
  - [technical-notes.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/technical-notes.md)
  - [architecture.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/architecture.md)
- Done when:
  - ontology、context graph、graph patch、runtime flow 的关系被清晰定义

## P1: Product / Agent Contracts

### T3. Finalize v0 PRD

- Goal:
  - 把 v0 产品要求写到可直接支持实现和评估
- Input docs:
  - [2026-03-delphi-v0-prd.md](/Users/wurenyu/workspace/Delphi/docs/01-product/requirements/2026-03-delphi-v0-prd.md)
  - [ux-contract.md](/Users/wurenyu/workspace/Delphi/docs/01-product/ux-contract.md)
- Done when:
  - 用户路径、报告结构、非目标范围稳定

### T4. Finalize agent contract

- Goal:
  - 锁定 4 个 agent 的职责、handoff 和 failure behavior
- Input docs:
  - [agent-contract.md](/Users/wurenyu/workspace/Delphi/docs/02-agent/agent-contract.md)
  - [safety-guardrails.md](/Users/wurenyu/workspace/Delphi/docs/02-agent/safety-guardrails.md)
- Done when:
  - 后续实现 agent 不需要再猜角色边界

### T5. Finalize eval design

- Goal:
  - 把 v0 eval 设计收敛到足够轻但真实有用
- Input docs:
  - [eval-plan.md](/Users/wurenyu/workspace/Delphi/docs/02-agent/eval-plan.md)
  - [2026-03-delphi-v0-prd.md](/Users/wurenyu/workspace/Delphi/docs/01-product/requirements/2026-03-delphi-v0-prd.md)
- Done when:
  - output structure、tool usage、trace quality 三类 eval 有明确验收口径

## P2: Engineering Contracts

### T6. Lock core interfaces

- Goal:
  - 固定 ResearchQuery、AgentTask、Finding、GraphPatch、RunEvent、FinalReport
- Input docs:
  - [2026-03-core-interface-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-core-interface-contract.md)
- Done when:
  - 未来实现无需再临时发明核心字段

### T7. Lock graph contract

- Goal:
  - 明确 ontology / KG / runtime context graph 的边界和写入约束
- Input docs:
  - [2026-03-ontology-context-graph-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-ontology-context-graph-contract.md)
- Done when:
  - graph validator 的职责和 scope 清楚

### T8. Lock data contract

- Goal:
  - 明确 OpenBB、Supabase、Neo4j 的职责分工
- Input docs:
  - [2026-03-data-layer-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-data-layer-contract.md)
- Done when:
  - 后续实现 agent 知道数据从哪里来、写到哪里去

### T9. Lock runtime contract

- Goal:
  - 明确 planner、event stream、degraded mode、Judge synthesis 的运行逻辑
- Input docs:
  - [2026-03-runtime-orchestration-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-runtime-orchestration-contract.md)
- Done when:
  - 后续 runtime 实现可直接照合同搭骨架

## P3: Build-Ready Preparation

### T10. Create implementation-ready code skeleton plan

- Goal:
  - 把当前文档映射到首轮代码目录、模块和接口
- Input docs:
  - 全部 canonical docs
- Done when:
  - 可以明确分派给 coding agents 开始写代码

### T11. Create demo query set

- Goal:
  - 准备答辩与联调所需的 gold demo queries
- Input docs:
  - [eval-plan.md](/Users/wurenyu/workspace/Delphi/docs/02-agent/eval-plan.md)
- Done when:
  - 至少有 3 条强展示 query 和 5 条基础测试 query

### T12. Create acceptance checklist

- Goal:
  - 把“v0 是否成立”收敛成一份可打勾清单
- Input docs:
  - PRD、eval、runtime contract
- Done when:
  - 任何 agent 都能按同一标准判断是否完成

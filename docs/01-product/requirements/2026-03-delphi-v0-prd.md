# Delphi v0 PRD

## Summary

- Feature / product: Delphi v0
- Owner: top-level product agent
- Status: draft-for-execution
- Related docs:
  - [project-brief.md](/Users/wurenyu/workspace/Delphi/docs/00-project/project-brief.md)
  - [dev_plan.md](/Users/wurenyu/workspace/Delphi/docs/dev_plan.md)
  - [ux-contract.md](/Users/wurenyu/workspace/Delphi/docs/02-product/ux-contract.md)
  - [agent-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-agent/agent-contract.md)
  - [2026-03-core-interface-contract.md](/Users/wurenyu/workspace/Delphi/docs/04-engineering/specs/2026-03-core-interface-contract.md)

## Problem

当前用户可以很快得到“看起来合理”的股票分析文本，但很难得到：

- 统一的 investment case 结构
- 跨数据源的组织性研究过程
- 可追踪的 reasoning path
- 可持续更新的研究对象

Delphi v0 要解决的问题不是“信息不够多”，而是“研究过程没有被结构化”。

## Goals

1. 跑通单一美股问题的完整研究闭环。
2. 让多 agent 协作和 reasoning trace 对用户可见。
3. 让最终输出稳定落在固定报告结构中。
4. 让 ontology / context graph 成为真实系统约束，而不是概念装饰。

## Non-Goals

- 覆盖全部资产类别
- 输出交易指令
- 支持自由 agent marketplace
- 做成专业交易终端
- 做完整长期 memory / learning system

## Primary User

首要用户是：

- 有一定金融理解、希望快速形成结构化个股判断的个人研究者
- 对 AI-native investing / agentic research 感兴趣的 builder

## Core User Story

- As a retail researcher, I want to ask whether a US stock is worth buying in a given horizon, so that I can quickly get a structured judgment and understand the reasoning process behind it.

## Supported Query Shape

v0 只保证以下类型：

- 美股个股
- 单一 ticker
- 单轮或短周期判断
- 典型问题见 eval / demo query set，不在这里重复展开

## Requirements

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| R1 | 用户可以输入自然语言个股问题 | must | 必须自动解析 ticker 或要求用户补充 |
| R2 | 系统必须生成固定结构最终报告 | must | 六段输出结构不可漂移 |
| R3 | 系统必须展示 4 个固定 agent 的运行状态 | must | 右侧 canvas 真实驱动 |
| R4 | 每个 agent 必须先产出 structured finding，再进入 synthesis | must | 不允许直接自由回答 |
| R5 | 运行过程必须生成 trace / graph patch | must | 写回策略受 validator 约束 |
| R6 | 右侧 canvas 可收起 | must | 收起后左侧仍完整可用 |
| R7 | 数据源失败时系统可降级 | must | 结果需提示置信度或缺失 |
| R8 | 至少支持一条稳定 gold demo path | must | 用于答辩和展示 |
| R9 | 支持多资产、多组合、多轮长期 case 演化 | wont | v0 不做 |

## Output Contract

最终结果必须满足：

- 面向用户的输出是固定结构报告
- 报告章节与字段合同以 UX contract 和 core interface contract 为准
- Judge 是唯一允许发布 final report 的角色

## User Flow

1. 用户输入一个单 ticker 个股问题。
2. 系统进入运行态并开始拆分研究任务。
3. 用户同步看到结果生成与过程可视化。
4. 系统输出结构化最终报告，并保留过程可回看。

更细的运行路径不在本 PRD 展开，分别见 UX contract、agent contract 和 runtime contract。

## Success Metrics

- 90% 以上的 demo queries 能输出完整六段结构
- 主要 demo query 在 60-120 秒内完成
- 用户能在一次体验后描述出至少 3 个 agent 的不同职责
- 评审能在 1 分钟内理解系统差异点

## Risks

- 过度追求 agent 炫技，牺牲结果可读性
- 过度追求图模型完整性，拖慢实现
- 数据接入过多导致系统不稳定
- 右侧 canvas 成为无意义动画而非真实状态

## Acceptance Criteria

- 支持范围保持在单 ticker、单 report、固定 4 agent
- 用户能获得稳定结构的最终报告
- 过程层是真实状态驱动，而不是纯展示动画
- 数据缺失、agent 失败、patch 被拒时系统可降级

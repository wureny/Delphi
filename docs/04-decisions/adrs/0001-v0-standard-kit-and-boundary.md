# ADR 0001: v0 Standard Kit And Product Boundary

## Title

- Delphi v0 采用固定边界与 boring standard kit

## Status

- accepted

## Context

Delphi 的技术与产品叙事都很容易失控。
如果没有固定边界，项目会自然滑向：

- 资产范围扩张
- agent 数量扩张
- 图模型过度设计
- 为了“agentic”引入额外框架

这会直接伤害 v0 的可交付性和演示质量。

## Decision

v0 锁定以下原则：

- 只做美股单 ticker 研究问答
- 只做 4 个固定 agent
- 只做单 query 到单 report 的闭环
- 前端与 runtime 默认走 TypeScript
- 不把 ADK 等额外 agent framework 设为默认依赖
- trace、graph patch、validator、final report contract 为四个中轴

## Alternatives Considered

- 方案 A：更开放的 agent 架构
  - 问题：对 v0 来说过度复杂
- 方案 B：更多数据源和更完整资产覆盖
  - 问题：稳定性与文档合同难以收敛
- 方案 C：以单模型单报告为核心
  - 问题：会损失项目真正的差异化

## Consequences

- 正向影响:
  - 更容易形成清晰 demo
  - 文档、实现、评估三者更容易对齐
  - 便于多线程 agent 并行执行
- 负向影响:
  - v0 的研究深度和覆盖范围被主动限制
  - 未来扩展需要通过 ADR 重新做边界决策
- 后续要补的工作:
  - 对核心接口合同保持持续更新
  - 对需要突破边界的改动补新增 ADR

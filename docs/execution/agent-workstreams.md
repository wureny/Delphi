# Delphi v0 Agent Workstreams

这份文档把后续 multi-thread 开发拆成几个稳定 workstreams。
每个 workstream 都对应一个“子 agent 应负责的能力面”，而不是某个零碎文件。

## W1. Product Framing Agent

- Mission:
  - 持续维护产品层 source of truth
- Owns:
  - [project-brief.md](/Users/wurenyu/workspace/Delphi/docs/00-project/project-brief.md)
  - [pr-faq.md](/Users/wurenyu/workspace/Delphi/docs/00-project/pr-faq.md)
  - [2026-03-delphi-v0-prd.md](/Users/wurenyu/workspace/Delphi/docs/01-product/requirements/2026-03-delphi-v0-prd.md)
  - [ux-contract.md](/Users/wurenyu/workspace/Delphi/docs/01-product/ux-contract.md)
- Main responsibility:
  - 防止产品边界漂移

## W2. Agent System Agent

- Mission:
  - 持续维护 agent roles、guardrails、eval 逻辑
- Owns:
  - [agent-contract.md](/Users/wurenyu/workspace/Delphi/docs/02-agent/agent-contract.md)
  - [eval-plan.md](/Users/wurenyu/workspace/Delphi/docs/02-agent/eval-plan.md)
  - [safety-guardrails.md](/Users/wurenyu/workspace/Delphi/docs/02-agent/safety-guardrails.md)
- Main responsibility:
  - 防止“多 agent”沦为没有边界的 prompt 拼接

## W3. Graph And Runtime Agent

- Mission:
  - 维护 ontology、context graph、runtime orchestration 的系统合同
- Owns:
  - [technical-notes.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/technical-notes.md)
  - [architecture.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/architecture.md)
  - [2026-03-core-interface-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-core-interface-contract.md)
  - [2026-03-ontology-context-graph-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-ontology-context-graph-contract.md)
  - [2026-03-runtime-orchestration-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-runtime-orchestration-contract.md)
- Main responsibility:
  - 防止 runtime 设计失控或图层语义漂移

## W4. Data Layer Agent

- Mission:
  - 维护外部数据接入与内部数据合同
- Owns:
  - [2026-03-data-layer-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-data-layer-contract.md)
- Main responsibility:
  - 防止 provider 接入过多、过早、过重

## W5. Execution Manager Agent

- Mission:
  - 维护 backlog、任务优先级和后续 coding agent 的分派逻辑
- Owns:
  - [agent-workstreams.md](/Users/wurenyu/workspace/Delphi/docs/execution/agent-workstreams.md)
  - [task-backlog.md](/Users/wurenyu/workspace/Delphi/docs/execution/task-backlog.md)
  - [dev_plan.md](/Users/wurenyu/workspace/Delphi/docs/dev_plan.md)
- Main responsibility:
  - 防止任务并行时互相踩边界

## Coordination Rules

- W1 和 W3 发生冲突时，先回到 v0 边界与用户价值判断。
- W2 和 W3 发生冲突时，优先保留系统约束而不是“agent 感”。
- W5 不负责重新定义产品，只负责把稳定文档转成可执行任务。

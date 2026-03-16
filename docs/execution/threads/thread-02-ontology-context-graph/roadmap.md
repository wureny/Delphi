# Thread 02 Roadmap

## Goal

把 Delphi v0 的 ontology 和 context graph 从文档合同推进到可接入 runtime / data layer 的实现合同，并保持目录清晰、边界稳定、不过度设计。

## Scope

- thread2 负责：
  - ontology object model
  - stable relationship registry
  - runtime meta graph registry
  - `GraphPatch` contract
  - validator policy
  - graph module code skeleton
- thread2 不负责：
  - OpenBB 抓取实现
  - snapshot normalization 细节实现
  - runtime orchestration 全链路实现
  - Neo4j 持久化适配器的完整开发

## Current Status

### Done

- 读完 thread2、`00-project`、`03-engineering` 相关文档并收敛职责边界
- 更新 canonical docs：
  - [2026-03-ontology-context-graph-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-ontology-context-graph-contract.md)
  - [2026-03-core-interface-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-core-interface-contract.md)
- 修正 [architecture.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/architecture.md) 中的错误 spec 链接
- 建立 `src/research-graph/` 代码骨架：
  - [ontology.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/ontology.ts)
  - [runtime.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/runtime.ts)
  - [merge-policy.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/merge-policy.ts)
  - [graph-patch.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/graph-patch.ts)
  - [validator.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/validator.ts)
  - [graph-writer.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/graph-writer.ts)
  - [neo4j-adapter.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/neo4j-adapter.ts)
  - [index.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/index.ts)
- 安装本地 TypeScript 最小环境，并验证 `npm run typecheck` 可通过
- 定义 graph writer interface 和 `submitGraphPatch()` 提交流程，打通 validator 到 writer 的调用边界
- 定义 stable object merge policy，并接入 validator 的 `merge_node` / immutable field 校验
- 定义 Neo4j adapter skeleton，可把 `GraphPatch` 规划成 Cypher statements 并通过可替换 executor 执行
- 接入真实 `neo4j-driver`，并补了 Aura 连接验证脚本
- 补了 `neo4j:smoke-write`，可对真实 Neo4j 做最小写入、读回验证和清理
- 补了 `neo4j:bootstrap`，可在 Aura 中初始化 ontology/runtime registry、merge policy 和 schema constraints

### In Progress

- 把 thread2 的实现骨架和 thread3 / thread4 的接口边界进一步接实
- 收敛 snapshot-to-evidence mapping interface

### Not Started

- snapshot-to-evidence 映射 contract 的代码层接口
- thread2 相关测试样例

## Recommended Build Order

1. 固化 graph module 的公共入口
2. 定义 graph writer interface
3. 定义 validator input / output shape，供 runtime 直接调用
4. 定义 stable object merge policy
5. 定义 snapshot-to-evidence mapping interface，和 thread3 对齐
6. 定义 runtime patch submission flow，和 thread4 对齐
7. 增加 validator test cases
8. 补真实 Aura 写入回归与后续测试样例

## Solution Outline

### 1. Module Layout

- 保持 `src/research-graph/` 扁平结构
- 一个文件只负责一类核心概念
- 统一从 `index.ts` 导出

### 2. Main Design Choice

- 采用 case-centered ontology
- `InvestmentCase` 是稳定层聚合中心
- runtime graph 和稳定层逻辑强隔离
- 所有图写入先经过 `GraphPatch` 和 validator

### 3. Data Flow

- external provider
- snapshot / normalization
- `Evidence` or stable object mapping
- agent outputs `Finding` + `GraphPatch`
- validator
- graph writer
- runtime/UI consume trace

### 4. Validation Principle

- 先保守，后放宽
- v0 优先拒绝不清晰 patch，而不是容忍隐式写入
- 先保证 schema 清楚、trace 可回放，再考虑优化灵活性

## Next Concrete Tasks

- 定义 snapshot-to-evidence mapping interface
- 补一组合法 / 非法 patch 样例
- 和 thread3 对齐 `Evidence.source_type / source_ref / observed_at` 的来源
- 和 thread4 对齐 patch 提交流程与 `patch_accepted / patch_rejected` 事件
- 在真实 Aura 中执行 `neo4j:bootstrap` 并确认结构可见

## Dependencies

### Upstream

- [technical-notes.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/technical-notes.md)
- [architecture.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/architecture.md)
- [agent-contract.md](/Users/wurenyu/workspace/Delphi/docs/02-agent/agent-contract.md)

### Downstream

- thread-03-data-layer-normalization
- thread-04-runtime-orchestration

## Risks

- ontology 和 runtime 边界再次混掉
- merge policy 过早复杂化
- 为了“专业”而拆出过多文件，导致真实开发成本升高
- thread3 / thread4 接口未对齐，导致 graph contract 失去约束力

## Exit Criteria

- thread4 可以直接调用 validator / graph writer interface 提交 patch
- thread3 可以直接按 contract 产出可映射到 `Evidence` 的对象
- 非法 patch 有稳定错误码和拒绝语义
- graph 模块目录在 v0 阶段不需要继续大规模重构

# Thread 05 Brief

## Name

- Frontend Shell / Canvas Runtime

## Mission

- 实现左侧聊天和结构化结果展示，右侧 4 terminal cards，消费 `RunEvent` 并支持展开/收起。

## Primary Source Docs

- [2026-03-delphi-v0-prd.md](/Users/wurenyu/workspace/Delphi/docs/01-product/requirements/2026-03-delphi-v0-prd.md)
- [ux-contract.md](/Users/wurenyu/workspace/Delphi/docs/01-product/ux-contract.md)
- [2026-03-core-interface-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-core-interface-contract.md)
- [2026-03-runtime-orchestration-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-runtime-orchestration-contract.md)

## Scope

- 明确做什么:
  - 搭一版可运行的前端壳层，固定左 report / 右 agent canvas 双栏结构
  - 以前端状态层消费 `RunEvent[]`，而不是直接读 runtime 内存
  - 支持 recorded demo feed 和未来 SSE feed 两种输入方式
  - 固定渲染 4 个 agent cards 与 6 个 report sections
  - 支持 canvas expand / collapse，并在收起时保留弱状态提示
- 明确不做什么:
  - 不修改 thread4 runtime 合同
  - 不发明新的 runtime event types
  - 不直接连接 Neo4j、Supabase 或 runtime 内存
  - 不做图谱视图、多 run 对比、拖拽布局、复杂图表系统

## Stop Condition

- 用户能明显感受到“系统在并行研究”，而不是在看一个装饰动画。

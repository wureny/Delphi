# Runtime Orchestration Contract

这份文档定义 Delphi v0 的运行时合同：run 生命周期、planner 职责、agent 执行约束、event stream 语义和降级策略。

## 1. Run Lifecycle

v0 统一生命周期：

`created -> planned -> agent_running -> synthesizing -> completed / failed / degraded`

说明：

- `created`: query 已接收，run 已建立
- `planned`: planner 已解析 query 并生成 tasks
- `agent_running`: agent 正在执行
- `synthesizing`: Judge 正在汇总
- `completed`: 成功输出 final report
- `failed`: 无法继续且无可接受降级
- `degraded`: 已输出结果，但存在明显缺失或部分失败

## 2. Planner Responsibilities

Planner 只做最小必要工作：

- 解析用户问题
- 识别 ticker
- 识别时间范围
- 推断 case type
- 生成 4 个初始 tasks
- 分配给固定 agent

Planner 不负责：

- 直接形成最终结论
- 替每个 agent 做完整分析
- 动态扩展 agent roster

## 3. Agent Execution Contract

每个 agent 执行顺序默认是：

1. 读取 task 与必要上下文
2. 调用 tools / skills
3. 形成 structured findings
4. 生成 graph patches
5. 发出 completion event

Judge 额外步骤：

6. 消费前置 findings
7. 输出 `FinalReport`

## 4. Tool / Skill Registry Contract

tools / skills 在 v0 中是受控注册能力，而不是任意函数池。

每个注册项至少定义：

- capability name
- description
- input shape
- output shape
- allowed agents
- failure semantics

v0 至少应存在：

- market data retrieval
- macro / liquidity retrieval
- graph patch proposal
- graph context retrieval
- report assembly helper

## 5. Event Stream Contract

前端只依赖 `RunEvent`，不直接读取 runtime 内部状态对象。

每次 run 至少应出现这些关键事件：

- run created
- planner completed
- task assigned x4
- tool start / finish
- finding created
- patch accepted / rejected
- judge synthesis started
- report ready

## 6. Parallelism Policy

v0 的“多 agent”以可观察的真实协作为目标，不以极致并发为目标。

允许：

- Thesis、Liquidity、Market Signal 并行或准并行
- Judge 在后置阶段汇总

不要求：

- 所有 agent 真并发到底层执行
- 复杂的抢占式调度

## 7. Degraded Mode Policy

进入 degraded mode 的典型条件：

- 某个数据源失败
- 某 agent 失败但其他 agent 成功
- 某些 patch 被拒绝但最终仍可形成报告

degraded mode 下必须：

- 输出 final report
- 显示不确定性或缺失维度
- 发出明确 degraded event

## 8. Hard Constraints

- 不暴露真实 shell 给 agent
- 不允许 agent 直接写数据库
- 不允许 UI 与 runtime 状态脱节
- 不允许 Judge 完全忽略前置 findings

## 9. Acceptance Criteria

- 没有 UI 时，也能从日志 / 事件序列中看清整次 run
- 有 UI 时，右侧 canvas 能准确复现关键状态变化
- 新增 tool 时只需扩展注册表，不需要重写整体 runtime

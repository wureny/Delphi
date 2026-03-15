# Eval Plan

Delphi v0 的 eval 目标不是做研究级 benchmark，而是保证系统对外“像一个可靠、结构稳定、过程真实的研究系统”。

## 1. Eval Goals

v0 先保证三类能力：

1. 输出结构稳定
2. agent 按预期走系统路径
3. trace / context graph 真实存在且最低限度合格

## 2. Eval Dimensions

| Dimension | What good looks like | Failure example | How to test |
| --- | --- | --- | --- |
| Output structure | 六段报告始终完整 | 缺段落、顺序漂移、自由散文 | schema / regex / JSON validation |
| Agent contract adherence | 各 agent 只做自己的职责 | Thesis Agent 直接输出最终建议 | run log + event sequence check |
| Tool / skill usage | agent 在需要时调用 data / graph tools | 不调用任何 tool 直接空谈 | event trace inspection |
| Trace presence | 有 task、finding、decision 路径 | 只有最终文本，没有 trace | graph node/edge presence check |
| Citation discipline | 最终判断引用 findings | Judge 凭空 synthesis | report-to-finding linkage check |
| Degraded behavior | 数据失败时仍能降级输出 | 某源失败即整次崩溃 | fault injection |

## 3. Demo Query Set

至少准备以下 5 类 query：

1. 大盘核心科技股
   - 例：`AAPL 未来三个月值不值得买？`
2. 高波动成长股
   - 例：`NVDA 现在是否已经 price in 太多预期？`
3. 宏观敏感型资产
   - 例：`TSLA 当前在利率环境下的风险收益比如何？`
4. 事件驱动型个股
   - 例：`某财报前个股是否值得博弈？`
5. 缺失 / 噪声场景
   - 例：冷门 ticker 或部分数据源故障

## 4. Minimum Eval Cases

### Output Structure Eval

- 检查最终报告是否始终包含：
  - `Final Judgment`
  - `Core Thesis`
  - `Supporting Evidence`
  - `Key Risks`
  - `Liquidity Context`
  - `What Changes The View`

### Tool / Skill Usage Eval

- 检查是否至少出现：
  - 一次 market data retrieval
  - 一次 graph patch proposal
  - 一次 patch accepted 或 rejected 事件
  - Judge 对前置 findings 的消费

### Trace Quality Eval

- 检查是否至少出现：
  - `Query` 节点
  - 至少 4 个 agent tasks
  - 至少 3 个 findings
  - 至少 1 条通向 `Decision` 或 `ReportSection` 的路径

## 5. Human Review Rubric

人工评审至少打 4 个维度：

- 结果是否清楚
- 过程是否可信
- 4 agent 分工是否明显
- ontology / trace 是否在产品中有解释价值

每个维度用 1-5 分评价，并备注最关键问题。

## 6. Release Gates

在进入答辩 demo 或下一阶段实现前，至少满足：

- 80% 以上 demo queries 通过 output structure eval
- 80% 以上 demo queries 通过 trace presence eval
- 核心 gold demos 连续多次运行不出现大面积空白或流程中断
- 至少一条数据源失败路径能优雅降级

## 7. What v0 Does Not Evaluate Deeply

v0 暂不重投入：

- 长期投资 alpha
- 市场超额收益真实性
- 完整金融知识覆盖率
- 全量 graph correctness benchmark

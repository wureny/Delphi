# Delphi v0 UX Contract

这份文档锁定 v0 的用户体验边界，供设计、前端、runtime agent、demo agent 共用。

## 1. UX Thesis

Delphi v0 必须同时完成两件事：

1. 让用户自然地把它当成一个 AI research assistant 使用。
2. 让用户明确意识到它不是单轮文本生成，而是一个可观察的多 agent 研究系统。

如果两者冲突，优先保住第 1 点，再通过可展开的过程层补充第 2 点。

## 2. Core Screen

产品整体采用双栏布局：

- 左侧为主问答区，默认占视觉主导。
- 右侧为可折叠的 agent canvas，用于展示真实运行状态。

默认状态：

- 首次进入时，左侧直接可提问。
- 右侧默认展开，但允许用户手动收起。
- 收起右侧后，左侧必须仍然是一个完整可用的产品，而不是残缺模式。

## 3. Left Panel Contract

左侧必须承载以下元素：

1. 顶部产品 framing
   - 一句简短描述，强调 structured stock research，而不是万能投资顾问。
2. 问题输入区
   - 支持自然语言个股问题
3. 运行中状态
   - 在结果区顶部显示当前阶段，如 `Planning`, `Thesis`, `Liquidity`, `Signals`, `Synthesizing`
4. 最终报告区
   - 按产品输出合同渲染，不允许自由漂移

左侧必须能清晰渲染以下 6 段：

1. `Final Judgment`
2. `Core Thesis`
3. `Supporting Evidence`
4. `Key Risks`
5. `Liquidity Context`
6. `What Changes The View`

## 4. Right Panel Contract

右侧 agent canvas 不是动画区，也不是系统监控大盘，而是“研究工作台”。

必须展示：

- 4 个固定 agent terminal card
- 每个 agent 当前状态
- 当前 task 摘要
- 最近一次 tool / skill 行为
- 最近一次 finding 或 decision 更新
- 全局 timeline 或 trace 高亮

这些内容必须来自 runtime event / state，而不是前端独立编造。

不展示：

- 原始 prompt 全量内容
- 底层数据库细节
- 杂乱的 token 日志
- 对普通用户无解释价值的内部调试信息

## 5. Terminal Card Contract

每张 terminal card 必须包含：

- Agent 名称
- Agent 当前 phase
- 状态灯：idle / running / blocked / done / failed
- 当前 task
- 最近动作
- 最近 finding 摘要

允许包含但不强制：

- 当前 skill 标签
- 关联 ontology object 标签
- 最近 trace node id 的简写

## 6. Interaction Rules

- 用户提交 query 后，左侧立即进入运行状态，不等待全部 agent 完成才反馈。
- 右侧卡片状态必须随着 runtime event 真实变化。
- 最终结果出现后，右侧仍允许回看过程。
- 右侧收起不应中断运行，只影响展示。

## 7. Demo Mode Rules

答辩或演示场景下，优先展示：

- 一个问题如何被拆成 4 类研究任务
- 各 agent 如何写出 finding
- Judge 如何基于前面 findings 形成判断
- 图与 trace 的存在是如何提升解释性的

不需要展示：

- 全量图结构
- 所有中间对象
- 所有失败分支

## 8. Failure UX

- 数据源失败时，左侧报告必须明确说明哪类信息缺失。
- 某 agent 失败时，右侧显示该 agent 降级状态，左侧报告继续产出但附带置信度提示。
- Graph write 被拒绝时，不对用户展示技术细节，只展示 “某些分析步骤未通过系统校验，结果已按降级模式生成”。

## 9. Acceptance Criteria

- 新用户在 10 秒内知道这是做什么的。
- 用户在第一次运行后能说出“这不是普通聊天机器人”。
- 用户在收起右侧 canvas 后仍愿意继续把它当作研究助手使用。
- 评审在展开右侧时能看懂 4 个 agent 分工，而不是只看到炫技界面。

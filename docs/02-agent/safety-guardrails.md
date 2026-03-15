# Safety And Guardrails

Delphi v0 不属于高风险自动执行系统，但它会给出投资相关判断，因此必须有明确 guardrail。

## 1. Risk Categories

- 错误或过度自信的投资判断
- 数据不完整时的伪确定性输出
- 越权调用 tools 或图写入
- 不可追踪的 synthesis
- 把研究助手误用成交易执行器

## 2. Guardrail Strategy

| Risk | Guardrail | Trigger | Fallback |
| --- | --- | --- | --- |
| 结论过强 | 禁止使用确定性措辞作为交易建议 | 高置信度但证据不足 | 降低置信度并加入不确定性说明 |
| 数据缺失 | 报告中必须显式说明缺失维度 | 数据源失败或空数据 | degraded mode |
| 非法图写入 | 只能通过 graph patch + validator | patch schema 不合法 | reject patch + log event |
| Judge 脱离 findings | final report 必须引用 findings | citations 缺失 | 阻止发布或降级 |
| 工具越权 | tool registry 白名单化 | 未注册 tool 请求 | 拒绝调用 |

## 3. User-Facing Safety Rules

- 产品不应自称投资顾问
- 不应输出“必须买入/必须卖出”式指令
- 应强调这是 research assistant，不是自动执行系统
- 当关键维度缺失时，优先提示局限性而不是维持完整幻觉

## 4. Internal Runtime Rules

- agent 不允许直接写数据库
- agent 不允许使用真实 shell
- 所有重要判断必须绑定 evidence、signal 或 finding
- 所有降级路径必须发出 `RunEvent`

## 5. Escalation Rules

必须提示不确定性的场景：

- 数据源缺失
- 关键信号互相冲突
- Judge 无法形成高置信度判断

必须拒绝的场景：

- 试图请求真实交易执行
- 试图绕过既定系统边界

必须请求用户补充的场景：

- 无法确定 ticker
- 用户问题超出 v0 范围，例如组合管理、多资产比较

## 6. Logging And Audit

至少要记录：

- 关键 tool 调用
- patch accepted / rejected
- degraded / failed 原因
- final report 与 findings 的对应关系

记录的目的不是全量观测，而是支持复盘：

- 为什么出现这个结论
- 哪一步失败了
- 哪个 agent 产出了关键 finding

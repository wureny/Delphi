# Delphi 内部产品与公司战略 v0.2

**状态：内部战略基线**  
**受众：创始团队、核心工程、长期顾问**  
**更新时间：2026-07-13**

---

## 1. Executive Thesis

通用模型、金融搜索平台和 Agent 产品会持续增强。摘要、问答、报告生成、通用 RAG、多 Agent choreography、搜索和部分工作流自动化都会快速商品化。

Delphi 的机会不在于“比 Claude 更懂金融”，而在于成为基金的正式决策状态层：

> **A model-powered institutional investment state machine.**

模型可以回答“这条信息可能意味着什么”；Delphi 必须持续回答：

- 它改变了本基金哪一条正式假设？
- 证据与不确定性是什么？
- 谁有权接受、编辑、拒绝或升级？
- 接受后，哪些 thesis、forecast、risk、task 和通知发生变化？
- 当时可获得的信息、模型、skill 和批准者分别是什么？
- 三个月或三年后，如何准确重建这次判断并评价结果？

长期价值来自 **canonical investment state + governed state transition + point-in-time memory**，不是单次生成质量。

---

## 2. 一句话定位

### 内部定义

> **Delphi 是面向 discretionary fundamental investment teams 的 AI-native Investment Decision OS。**

### 客户定义

> **Delphi compares every material event against your approved investment view, proposes the changes that matter, and records what your team actually decided.**

### 网站定义

> **From market events to governed investment decisions.**

### 不应使用的定位

- AI equity research chatbot；
- autonomous investing agent；
- AI analyst replacement；
- report generator；
- generic multi-agent platform；
- “Bloomberg killer”；
- guaranteed-alpha system。

---

## 3. 首个产品楔子：Earnings-to-Thesis

### 3.1 为什么选它

Earnings-to-Thesis 同时具备：

- 高频、可预测的事件入口；
- 明确的原始证据；
- 与 forecast / thesis 的天然比较关系；
- 可观察的人工 review 行为；
- 可通过历史财报做回放评测；
- 对 PM、Analyst、Head of Research 都有可解释价值；
- 能自然扩展到 catalyst、management meeting 和 portfolio impact。

### 3.2 核心闭环

```text
Earnings release / call / filing
→ normalize and reconcile facts
→ retrieve approved thesis snapshot
→ compare actuals and statements against expectations
→ classify thesis impact
→ create cited Thesis Delta Proposal
→ analyst review
→ optional PM approval
→ record StateTransition in Decision Ledger
→ create follow-up work and notifications
```

### 3.3 用户看到的默认对象

不是一篇长报告，而是一组变化：

```text
What changed
Against our view
Why it matters
Evidence
Confidence
What remains unknown
Recommended follow-up
Required reviewer
Approval state
```

---

## 4. 原型与公司愿景的边界

### 原型必须证明

- 有稳定、版本化的 `InvestmentCase` 与 `ThesisSnapshot`；
- 新事件与“旧状态”发生明确比较；
- 证据可定位；
- proposal 与 approved state 分开；
- 人工 action 触发正式状态转换；
- Ledger 可回放；
- degraded 状态诚实可见；
- runtime 过程可观察，但不泄露内部 chain of thought。

### 原型不需要证明

- 真实客户全部连接器；
- 生产级 VPC；
- 组合级风险；
- 自动交易；
- 任意 workflow builder；
- 无限制 Agent 自主性；
- 全市场覆盖；
- alpha；
- 完整 SOC 2；
- 多租户企业计费。

---

## 5. ICP

### 5.1 首要 ICP

- fundamental long/short 或 concentrated long-only；
- 5–30 名投资与研究人员；
- 有稳定 coverage、正式 thesis 和真实持仓；
- earnings / catalyst 密集；
- 已使用 Excel、专业数据、Slack/Teams/Email 与共享文档；
- 缺少成熟的内部 AI platform team；
- CIO、PM 或 Head of Research 愿意担任 sponsor；
- 愿意以 shadow mode 提供历史或当前 workflow。

### 5.2 早期排除

- 纯 HFT、stat-arb、CTA 或没有 narrative thesis 的团队；
- 超大型 multi-manager 平台作为首批生产客户；
- 只想购买低价摘要工具的团队；
- 要求自动下单或未批准写回的客户；
- 每家都要求专属 ontology 和独立代码分支的市场；
- 无法提供任何可复盘事件的“创新合作”。

### 5.3 采购角色

| 角色 | 价值 |
|---|---|
| Analyst | 减少重复阅读、数字核对、引用整理和状态同步；保留判断权 |
| PM / CIO | 只接收 material deltas；快速理解 thesis 与风险影响 |
| Head of Research | 统一 thesis、assumptions、catalysts、review 与 postmortem |
| COO / CTO / CISO | 清楚的数据边界、可替换模型、可维护部署与供应商责任 |
| CCO / Legal | 数据用途、权限、模型/skill 版本、记录保存与审计证据 |

---

## 6. 产品原则

### 6.1 Delta over document

默认交付是变化，而不是另一份文档。完整报告可按需生成，但不应成为首页。

### 6.2 Proposal before mutation

```text
Agent inferred
→ Analyst confirmed
→ PM approved
→ System recorded
```

模型不得静默修改正式 thesis、forecast 或风险状态。

### 6.3 State persists, agents terminate

Agent 是短生命周期执行者；正式状态、证据、审批、结果与版本长期存在。

### 6.4 Human attention precision

最稀缺资源不是 token，而是 PM 注意力。核心质量问题是：

> 进入 PM 视野的变化中，有多少真正 material？

### 6.5 Point-in-time correctness

历史回放必须锁定：

- 当时已发布和已观察的信息；
- 当时批准的 thesis / forecast；
- 当时模型、skill、workflow 版本；
- 当时数据权限；
- 当时审批链。

### 6.6 Improve first, selectively replace

Delphi 保留 Bloomberg / FactSet / AlphaSense、Excel、Slack / Teams、SharePoint / Drive、PMS / OMS；优先替代它们之间依赖复制粘贴、人脑记忆和口头同步的连接。

### 6.7 Explicit uncertainty

缺数据、证据冲突、数值不一致或 agent 失败时，系统应降级并暴露边界，不得用流畅文本掩盖缺口。

---

## 7. 技术战略

### 7.1 持久层

初期以 PostgreSQL 为 canonical source of truth：

```text
source_documents
source_excerpts
domain_events
claims
evidence_links
assumptions
thesis_versions
thesis_pillars
forecasts
catalysts
risks
open_questions
decisions
positions
outcomes
reviews
workflow_runs
state_transitions
relation_edges
```

Graph、vector 和全文搜索是 projection，不是唯一真相。

### 7.2 Agent 边界

Agent 只能：

- 读取任务范围内证据；
- 生成结构化 Finding；
- 提交符合 schema 的 proposal；
- 请求受政策控制的工具；
- 给出 confidence 与 unknowns。

Agent 不能：

- 任意创造对象类型；
- 绕过 proposal 审批；
- 直接写正式状态；
- 持有长期 credential；
- 把网页或文档中的文本当系统指令；
- 对外发信、改文件或执行交易而无审批。

### 7.3 评测优先于“自进化”

任何 prompt、skill、模型或 routing 的变化必须：

```text
proposal
→ offline eval
→ regression review
→ shadow / canary
→ human promotion
```

不允许 Agent 静默修改生产 Skill。

---

## 8. 差异化

Hebbia、Rogo、AlphaSense、Finster 等已覆盖金融搜索、私有数据连接、Agent、自动化工作流、引用和企业安全。Delphi 不能把这些通用能力当护城河。

### 8.1 Delphi 要拥有的层

1. **Canonical investment state**  
   正式 thesis、assumptions、forecasts、risks、open questions 和 owner。

2. **Governed transition surface**  
   proposal、review、approval、rollback、version 和责任链。

3. **Point-in-time Decision Ledger**  
   当时看到什么、为什么变化、谁批准、后来发生什么。

4. **Firm-specific materiality and eval**  
   对这家基金什么变化值得 PM 注意，什么模型/skill 在其 workflow 中可靠。

5. **Customer-owned trust boundary**  
   数据、身份、密钥、模型 endpoint 与运行环境可由客户掌控。

6. **Workflow embedding**  
   进入 earnings、周会、PM review 和 postmortem，而不是停留在偶发 chat。

### 8.2 可信定位

> **Others help finance teams find and generate information. Delphi governs how a fund’s approved view changes over time.**

不要声称竞品“没有审计”“没有 Agent”或“没有工作流”；这些表述已经不真实。要说明产品中心不同。

---

## 9. 商业模式（规划假设）

### 收入

- annual platform license；
- Workflow Packs；
- implementation；
- private deployment premium；
- support / SLA；
-持续评测与升级。

客户直接承担其模型、数据与云成本，Delphi 不依赖 token 转售。

### 价格假设

| 阶段 | 规划区间 |
|---|---:|
| 4–8 周付费 shadow pilot | $8k–$25k |
| 单团队、单 workflow | $40k–$100k ARR |
| 多团队、多 workflow | $100k–$250k+ ARR |
| Customer VPC / Sovereign | 额外实施与许可费用 |

这些都不是已验证成交价格。

---

## 10. GTM

### 10.1 Founder-led sequence

```text
Warm introduction
→ Reverse Demo of a recent real event
→ One-Event Proof
→ 4–8 week paid shadow pilot
→ Controlled production
→ second workflow expansion
```

### 10.2 第一批设计伙伴

目标不是广泛获客，而是 **3–5 家高度相似的机构**：

- 同一 ICP；
- 同一 Earnings-to-Thesis Pack；
- 同一 Trust Package；
- 同一组评测；
- 不产生客户专属代码分支。

### 10.3 80 / 15 / 5 原则

- 80% 标准产品；
- 15% 声明式配置；
- 5% 客户专有集成。

Solutions engineering 的目标是把客户流程编译为配置，而不是重新开发 Delphi。

---

## 11. 核心指标

### 原型与产品质量

- citation validity；
- numeric reconciliation accuracy；
- claim-to-source coverage；
- degraded-state honesty；
- median review time；
- accept / edit / reject / escalate rate；
- proposal schema validity；
- replay determinism。

### 客户价值

- event-to-reviewed-output latency；
- analyst time saved（通过 workflow study 验证）；
- PM materiality rating；
- false-positive / false-negative；
- approved thesis deltas；
- triggered model review or follow-up；
- weekly workflow use；
- second-workflow expansion。

### 长期北极星

> 每 100 个进入 PM 注意力范围的 Delphi 变化中，被团队认定为真正 material 并改变研究动作、模型复核或投资讨论的比例。

---

## 12. 六个月商业与技术里程碑

### Milestone A — Demonstrable wedge

- 可交互原型；
- 两个可重放 earnings cases；
- website + architecture + trust narrative；
- citation / number / degradation tests；
- 10–15 次高质量买方访谈。

### Milestone B — Design partner proof

- 3–5 个设计伙伴候选；
- 至少 2 个 One-Event Proof；
- 一个明确的付费 pilot proposal；
- 访谈证据支持或推翻 ICP 与 workflow 假设。

### Milestone C — Shadow pilot

- 10–20 个 names；
- 1–2 类事件；
- 只读 thesis / model；
- 每周 review；
- 明确的 usefulness、precision、review time 数据。

### Milestone D — Controlled production path

- Decision Ledger；
- approved write-back；
- bitemporal versions；
- customer-owned data plane alpha；
- Trust Package；
- 标准 implementation playbook。

---

## 13. 反目标与停损信号

### 不做

- 自动交易；
- “无限 Agent 平台”；
- 第一阶段 portfolio optimization；
- 客户专属 ontology fork；
- 用公开数据生成泛化研报；
- 以展示模型 chain of thought 作为透明度；
- 把安全基础能力作为高价勒索项。

### Kill / pivot signals

- 买方只愿意为摘要付费，不愿接入正式 state；
- Earnings-to-Thesis 的有用 delta 无法稳定超过人工噪声；
- 每家 pilot 都需要独立代码；
- 目标客户普遍已有更强内部平台且无购买意愿；
- PM materiality precision 随反馈不改善；
- Customer-owned deployment 成本使中型客户无法承受；
- Analyst 将产品持续视为监控工具且 adoption 无法修复。

---

## 14. EFL 叙事

对 EFL 应强调：

- **创新核心**：typed institutional state + validated state transitions + point-in-time ledger；
- **技术证据**：bounded orchestration、explicit events、schema validation、graceful degradation；
- **商业化楔子**：Earnings-to-Thesis；
- **可执行性**：明确的 6 个月 milestone 和设计伙伴路径；
- **团队需求**：GTM、客户发现、定价、金融采购与融资叙事；
- **诚实边界**：原型不是 production，也不承诺 alpha。

EFL 材料中不要让宏大愿景淹没首个闭环。技术越深，产品范围越要窄。

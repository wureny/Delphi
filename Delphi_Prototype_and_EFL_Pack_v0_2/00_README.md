# Delphi Prototype & EFL Application Pack v0.2

**更新日期：2026-07-13**  
**用途：内部决策、原型实现、NYU Endless Frontier Labs 申请、投资人沟通、设计伙伴与客户沟通**  
**当前核心定义：Delphi is the fund’s harness, not the model’s harness.**

> **Delphi 是面向基本面投资机构的 AI-native Investment Decision OS：它把新信息与团队当前批准的投资状态进行比较，生成有证据、可审核的状态变更提案，并保留 point-in-time 的决策历史。**

---

## 1. 这套材料的目标

这不是一套“介绍 AI 金融助手”的泛化材料，而是一套围绕一个可证明闭环组织的执行包：

```text
Earnings event
→ extract and reconcile evidence
→ compare against approved thesis and forecasts
→ produce a cited Thesis Delta Proposal
→ analyst accepts / edits / rejects / escalates
→ approved change enters the Decision Ledger
```

该闭环同时服务四件事：

1. **原型实现**：让 Claude Code / Codex 能按明确合同搭建可交互 Demo；
2. **孵化器筛选**：证明 Delphi 有创新技术核心、明确商业化路径和可执行里程碑；
3. **客户验证**：让 PM、CIO、Head of Research、COO/CTO/CCO 快速理解价值与边界；
4. **团队对齐**：避免项目退化为通用金融聊天、报告生成器或无限定制咨询。

---

## 2. 当前最重要的产品决定

### 2.1 原型只证明一个高价值闭环

原型聚焦 **Earnings-to-Thesis**，不是建设完整 Investment OS。原型必须让评审者亲眼看到：

- 系统知道团队“原先相信什么”；
- 系统能指出“这次事件改变了什么”；
- 每项变化都能追到证据；
- 模型只能提出 proposal，不能静默改写正式状态；
- 人工批准后，系统形成有版本、有责任人的状态转换；
- 当数据缺失或验证失败时，系统明确进入 degraded 状态，而不是伪装完整。

### 2.2 Change Inbox 是首页，Chat 不是首页

默认入口是待审核变化，而不是空白输入框。Chat 可作为辅助检索界面，但不能代表 Delphi 的核心价值。

### 2.3 Fixture-first，live-model optional

EFL Demo 必须稳定。默认以可重放 fixture 完成全流程；真实模型、真实行情或外部数据只能作为可选增强，不得成为演示成功的单点依赖。

### 2.4 对外只讲一家公司故事

当前 EFL、网站和投资人材料统一使用 **Delphi**。不要在同一申请中引入第二品牌、第二平台或过宽的“未来 Agent 经济基础设施”叙事，以免削弱可信度。

---

## 3. 文档地图

| 文件 | 主要受众 | 用途 |
|---|---|---|
| `01_INTERNAL_STRATEGY_ZH.md` | 创始团队、顾问 | 公司与产品判断、ICP、GTM、指标、反目标 |
| `02_PROTOTYPE_PRD_ZH.md` | 产品、设计、工程 | 原型范围、用户旅程、功能和验收 |
| `03_UX_AND_INTERACTION_SPEC_ZH.md` | 设计、前端 | IA、页面、组件、状态与视觉语言 |
| `04_SYSTEM_ARCHITECTURE.md` | 工程、技术评审 | Prototype / production 架构、信任边界、迁移路径 |
| `05_DOMAIN_MODEL_AND_API_CONTRACTS.md` | 全栈工程 | 对象、TypeScript 合同、API、事件、fixture |
| `06_AGENT_WORKFLOW_AND_EVALS.md` | AI / 应用工程 | 有边界 Agent、验证器、降级语义和评测 |
| `07_SECURITY_PRIVACY_TRUST.md` | 客户技术与合规 | 数据边界、政策、日志、部署与 Trust Package |
| `08_INVESTOR_INCUBATOR_MEMO_EN.md` | EFL、投资人 | 英文投资与孵化器 Memo |
| `09_EFL_APPLICATION_ANSWER_BANK_EN.md` | 申请填写者 | 对照申请问题的英文答案底稿 |
| `10_CUSTOMER_OVERVIEW_EN.md` | 设计伙伴、客户 | 英文客户一页式说明和 pilot 方案 |
| `11_WEBSITE_COPY_EN.md` | 网站、品牌 | 公司网站信息架构与英文文案 |
| `12_BUILD_BRIEF_FOR_CLAUDE_CODE_CODEX.md` | 代码 Agent | 可直接复制的实现任务书 |
| `13_DEMO_SCRIPT_AND_ACCEPTANCE.md` | 创始人、演示者 | 90 秒 / 4 分钟脚本、验收、故障预案 |
| `14_COMPETITIVE_POSITIONING.md` | 创始团队、投资人 | 竞品矩阵、可信差异化与禁用表述 |
| `15_ROADMAP_RISK_REGISTER_ZH.md` | 创始团队 | 截止日前计划、六个月里程碑、风险与 kill signals |
| `16_FOUNDER_INPUT_CHECKLIST.md` | 创始人 | 所有不可编造、必须补全的公司事实 |
| `17_SOURCES_AND_ASSUMPTIONS.md` | 全体 | 外部来源、内部假设、证据等级 |
| `18_FUND_CONTEXT_INGESTION_BOUNDARY.md` | 产品、工程、客户技术团队 | Demo 数据接入边界、治理字段与生产迁移条件 |
| `diagrams/ARCHITECTURE_DIAGRAMS.mmd` | 工程、材料制作 | 独立 Mermaid 图 |
| `html/index.html` | 所有人 | 可搜索、可筛选的文档门户 |
| `html/Delphi_Prototype_Wireframe.html` | 产品、工程、评审 | 可点击、可模拟审批的高保真原型规格 |
| `html/Delphi_Company_Website_Mockup.html` | 品牌、前端 | 响应式公司网站视觉与文案方向 |
| `html/Delphi_Architecture_Board.html` | 工程、EFL、客户技术团队 | 可直接截图或展示的架构总览板 |
| `schemas/domain-types.ts` | 全栈工程 | 可直接复制的 TypeScript 领域合同 |
| `schemas/domain.schema.json` | 全栈工程 | Fixture / payload JSON Schema |
| `Delphi_Master_Context.md` | Claude Code / Codex | PRD、架构、合同、评测与实施要求合并上下文 |
| `QA_REPORT.md` | 创始人、工程 | 已执行的结构、类型与浏览器交互验收 |
| `scripts/validate_package.py` | 工程 | Fixture、引用、时间线和 HTML 结构验证 |
| `scripts/interaction_smoke_test.py` | 工程 | Chromium 交互验收与预览图生成 |
| `previews/` | 全体 | 门户、原型、Ledger、降级、网站与架构预览图 |
| `package-manifest.json` | 工程、归档 | 每个交付文件的大小与 SHA-256 校验值 |

---

## 4. 事实、假设和占位符规则

文档使用以下标签：

- **[VERIFIED EXTERNAL]**：来自当前官方或权威外部来源；
- **[INTERNAL DECISION]**：当前创始战略决定；
- **[PLANNING ASSUMPTION]**：价格、市场、时间或转化假设；
- **[PROTOTYPE EVIDENCE]**：历史技术原型已展示过的能力，但不能等同生产就绪；
- **[FOUNDER INPUT REQUIRED]**：必须由创始人补充，严禁推断；
- **[DO NOT CLAIM YET]**：在得到客户、法律或技术证据前不得对外承诺。

特别注意：

- 不把 fixture-backed prototype 描述为 live production system；
- 不把规划价格写成已成交价格；
- 不把客户访谈写成客户；
- 不把 LOI、design-partner interest 写成收入；
- 不承诺 alpha、收益改善或自动投资决策；
- 不把模型内部 chain of thought 当作审计记录。

---

## 5. NYU Endless Frontier Labs 申请约束

**[VERIFIED EXTERNAL]**

- 2026–27 申请截止：**2026-07-31 11:59 PM ET**；
- EFL 是 9 个月、目标驱动的项目，包含 5 个 Meeting Days；
- Digital Tech 适用于利用软件、数据、AI 与机器学习的公司；
- 公司需要正式注册，并至少有一名全职成员推动业务；
- 评审更看重创新技术核心、商业里程碑和执行能力，而不是仅有漂亮叙事；
- 官网称项目只录取约前 5% 申请者。

因此，材料不能只展示愿景。提交前至少需要形成：

```text
incorporation eligibility
+ coherent website
+ working interactive demo
+ architecture / technical novelty
+ defensible customer wedge
+ concrete six-month milestones
+ founder and IP facts
+ customer-discovery evidence
```

详情见 `09_EFL_APPLICATION_ANSWER_BANK_EN.md` 和 `16_FOUNDER_INPUT_CHECKLIST.md`。

---

## 6. 建议使用顺序

### 原型实现

1. 阅读 `02_PROTOTYPE_PRD_ZH.md`
2. 阅读 `03_UX_AND_INTERACTION_SPEC_ZH.md`
3. 阅读 `04_SYSTEM_ARCHITECTURE.md`
4. 把 `Delphi_Master_Context.md` 和 `12_BUILD_BRIEF_FOR_CLAUDE_CODE_CODEX.md` 交给代码 Agent
5. 以 `13_DEMO_SCRIPT_AND_ACCEPTANCE.md` 做验收

### EFL 申请

1. 补全 `16_FOUNDER_INPUT_CHECKLIST.md`
2. 核对 `08_INVESTOR_INCUBATOR_MEMO_EN.md`
3. 逐项填写 `09_EFL_APPLICATION_ANSWER_BANK_EN.md`
4. 用原型录制 90–150 秒演示
5. 网站上线后，保证申请、网站、Deck 和 Demo 使用同一定位

### 客户沟通

1. 先发 `10_CUSTOMER_OVERVIEW_EN.md`
2. 会议中做 Reverse Demo，而不是通用产品演示
3. 只提出 4–8 周 shadow pilot
4. 安全问题使用 `07_SECURITY_PRIVACY_TRUST.md`

---

## 7. 版本与变更

```text
v0.1  创始判断与产品假设
v0.2  原型 / EFL 执行包（当前）
v0.3  设计伙伴访谈后
v0.4  EFL 提交与可公开网站后
v0.5  第一轮 shadow pilot 后
v1.0  可重复部署与续费得到验证后
```

每次重大变更应记录：

- 日期与负责人；
- 新证据；
- 被推翻的旧假设；
- 产品、技术与商业影响；
- 下一步验证方式。

---

## 8. 当前成功标准

到 EFL 提交时，最有说服力的状态不是“功能很多”，而是：

> 一个任何评审者都能在几分钟内理解、亲自点击、看到证据链、完成人工审批，并在 Ledger 中验证正式状态变化的闭环。

这套材料提升申请质量，但不保证录取。真正决定结果的是：**可运行证据、技术可信度、创始执行力与商业验证。**

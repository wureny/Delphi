# Delphi 路线图、EFL 提交计划与风险登记 v0.2

**基准日期：2026-07-13**  
**EFL 截止：2026-07-31 11:59 PM ET**  
**原则：先闭环，再扩展；先证据，再叙事。**

---

## 1. 截止日前优先级

### P0 — 资格与事实

- 确认公司正式注册；
- 确认至少一名全职成员；
- 确认 CEO 可参加全部 Meeting Days；
- 确认技术与历史代码 IP 归属；
- 补全团队、融资、burn、runway、客户、收入事实；
- 确认公司域名、邮箱和法律名称。

没有这些，文案再好也不能替代申请资格和准确性。

### P0 — 可运行证据

- 完成 deterministic interactive demo；
- 成功案例；
- degraded 案例；
- Accept / Edit / Reject / Escalate / Defer；
- v12 → v13；
- Ledger；
- Privacy Receipt；
- Reset；
- 部署 URL；
- 90–150 秒视频。

### P0 — 对外一致性

- 网站；
- Deck；
- EFL 申请；
- Demo；
- Founder bio；
- 市场与竞品；
- 六个月 milestones。

所有材料使用同一句核心定位。

### P1 — 商业证据

- 10–15 个高质量访谈，越多越好但不牺牲原型；
- 50–100 named accounts；
- 3–5 design-partner candidates；
- 至少一个具体 One-Event Proof 讨论；
- 记录支持和推翻的假设。

---

## 2. 建议日历

### 7 月 13–16 日：规格与事实闭环

- 固化本套文档；
- 完成 founder input；
- 决定 greenfield 或迁移旧代码；
- 锁定 fixture；
- 产出 repo plan；
- 公司注册 / IP /域名问题立即处理。

### 7 月 17–21 日：产品闭环

- domain contracts；
- fixtures；
- review gateway；
- ledger；
- inbox；
- run observatory；
- degraded mode；
- tests。

### 7 月 22–24 日：网站与演示

- 网站；
- responsive；
- screenshots；
- 90 秒和 4 分钟脚本；
- clean deployment；
- recording。

### 7 月 25–27 日：申请初稿与外部反馈

- 填完申请；
- 至少两位技术 / 商业读者审阅；
- 至少一位不熟悉 Delphi 的人测试 Demo；
- 检查所有数字和主张。

### 7 月 28–30 日：冻结与验证

- 不再新增大功能；
- 修复 broken states；
- 备份；
- 测试所有 URL；
- proofread；
- 事实确认；
- 提前提交准备。

### 7 月 31 日：提交

不要把首次完整提交留到最后一小时。

---

## 3. 0–6 个月路线图

### Stage 0 — Application-ready prototype

目标：

- 任何人 4 分钟内理解和操作；
- deterministic fixture；
- architecture / security narrative；
- EFL 材料完整。

### Stage 1 — Customer discovery

目标：

- 15–25 structured interviews；
- 50–100 named accounts；
- 确认 economic buyer；
- 明确 current workflow、pain、data boundary、budget；
- 推翻至少一个弱假设。

### Stage 2 — One-Event Proof

目标：

- 2–3 家候选机构；
- 历史 earnings event；
- 客户提供可公开/脱敏或受控 thesis / forecast；
- 对比真实 workflow；
- 记录错误、有用性和 adoption friction。

### Stage 3 — Paid shadow pilot

目标：

- 1+ 付费 pilot；
- 10–20 names；
- 4–8 周；
- read-only；
- 每周 review；
- 明确 precision、review time、action rate。

### Stage 4 — Controlled production design

目标：

- Postgres Decision Ledger；
- bitemporal versions；
- approved write-back；
- SSO / RBAC path；
- standard Trust Package；
- customer-owned Data Plane alpha；
- implementation playbook。

---

## 4. 6–18 个月路线图

### 6–9 个月

- 至少 2 家客户把 approved delta 用于正式流程；
- first renewal / expansion evidence；
- second workflow: Catalyst Monitor；
- materiality eval；
- customer references；
- deployment time下降。

### 9–12 个月

- 6–10 家付费机构是强但非承诺目标；
- read-only portfolio mapping；
- PM attention ranking；
- firm overlay；
- repeatable security review；
- no customer-specific runtime fork。

### 12–18 个月

- Portfolio Impact；
- Management Meeting Loop；
- Monthly Thesis Integrity Review；
- Decision Postmortem；
- point-in-time replay；
- shadow/canary skill promotion；
- advanced private deployment。

---

## 5. 风险登记

| 风险 | 概率 | 影响 | 当前缓解 | Kill / pivot signal |
|---|---|---|---|---|
| 产品被视为摘要工具 | 高 | 高 | 强制 approved-state / ledger Demo | 客户拒绝接入任何正式状态 |
| 竞品快速复制状态功能 | 中高 | 高 | 深化审批、point-in-time、eval、部署 | 无法解释为何独立采购 |
| Materiality precision 低 | 高 | 极高 | 窄事件、历史评测、PM feedback | false positives 不随反馈下降 |
| 数字与引用错误 | 中高 | 极高 | deterministic validator、reconciliation | 真实案例无法达到信任阈值 |
| 数据 / licensing 阻塞 | 高 | 高 | synthetic/public first、customer contracts | 核心 workflow 无合法数据路径 |
| Security review 太慢 | 高 | 高 | shadow pilot、read-only、trust package | 小客户也要求不可承受部署 |
| 客户需求碎片化 | 高 | 高 | 80/15/5、同一 Strategy Pack | 第 5 家仍需大量专属代码 |
| Analyst adoption 失败 | 中高 | 高 | proposal、private draft、无绩效监控 | 用户持续回到手工流程 |
| 创始人范围膨胀 | 高 | 高 | 单一闭环、feature freeze | Demo 无法 4 分钟讲清 |
| Live model 不稳定 | 高 | 中 | fixture-first、adapter | 现场依赖外部 provider |
| 缺少真实历史 thesis | 高 | 高 | design-partner replay、synthetic eval | 无法评估 against-our-view |
| 早期公司信誉不足 | 中高 | 高 | export、customer-owned plane、advisors | 付费 pilot 仍因生存风险被拒 |
| 法律 / IP 不清 | 未知 | 极高 | 立即核查与 assignment | 无法确认公司拥有核心技术 |
| 团队覆盖不足 | 未知 | 高 | 明确 hiring / cofounder plan | 技术和销售都由单点承担且执行停滞 |

---

## 6. 产品假设

### H1：痛点是 thesis maintenance，不只是 search

**Evidence needed:** 客户愿意展示其 approved thesis 与 review process。  
**Kill:** 只想要通用 research assistant。

### H2：Earnings-to-Thesis 是正确楔子

**Evidence needed:** 高频、可复盘、可以节省 review 并触发动作。  
**Kill:** 真实判断过于隐性，系统 delta 长期无用。

### H3：客户为治理与状态付费

**Evidence needed:** 决策记录、审批、audit、institutional memory 出现在购买理由中。  
**Kill:** 这些只是“nice to have”，价格只能接近摘要工具。

### H4：中型基金 buy > build

**Evidence needed:** 付费 pilot 和缺乏平台维护能力。  
**Kill:** ICP 普遍可低成本自建或预算过低。

### H5：Customer-owned Data Plane 降低摩擦

**Evidence needed:** 安全审查明确偏好且愿承担 premium。  
**Kill:** 成本远高于价值，或 Managed 已足够。

### H6：Decision Ledger 驱动 retention

**Evidence needed:** 客户持续审批、查询、复盘、扩展。  
**Kill:** ledger 很少被使用，价值仍是一次性输出。

---

## 7. EFL readiness scorecard

| 维度 | 最低证据 | 当前状态 |
|---|---|---|
| Eligibility | incorporated + one full-time member | `[FOUNDER INPUT REQUIRED]` |
| Technical core | typed state + governed transition + demo | Build target |
| Working product | public resettable prototype | Build target |
| Website | coherent public site | Build target |
| Market | bottom-up model + named accounts | Model exists; named accounts needed |
| Customer evidence | interviews / design partners | `[FOUNDER INPUT REQUIRED]` |
| Team | credible build and commercialization coverage | `[FOUNDER INPUT REQUIRED]` |
| IP | documented ownership | `[FOUNDER INPUT REQUIRED]` |
| Funding facts | accurate stage / burn / runway | `[FOUNDER INPUT REQUIRED]` |
| 6-month milestones | measurable plan | Drafted |
| Program fit | concrete requests from EFL | Drafted |

---

## 8. Feature freeze rules

After product loop works, do not add:

- portfolio dashboard;
- complex graph animation;
- multiple strategies;
- real trading;
- Slack integration;
- broad live web research;
- custom workflow builder;
- mobile product review;
- billing;
- enterprise settings screens.

Fix:

- clarity;
- evidence;
- review;
- ledger;
- degraded mode;
- deployment;
- tests;
- website;
- video.

---

## 9. Evidence ladder

```text
Claim
< screenshot
< clickable fixture
< deterministic tested fixture
< historical replay
< customer One-Event Proof
< paid shadow pilot
< controlled production use
< renewal / expansion
```

每份对外材料必须清楚说明自己位于哪一级。

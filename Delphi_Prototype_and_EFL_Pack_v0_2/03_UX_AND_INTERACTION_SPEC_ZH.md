# Delphi UX 与交互规格 v0.2

**设计方向：Institutional, calm, information-dense, inspectable**  
**默认主题：深色；支持浅色不是原型阻塞项**  
**核心界面：Change Inbox + Delta Review + Decision Ledger**

---

## 1. 体验目标

用户第一次打开 Delphi，应在 10 秒内理解：

1. 这不是聊天机器人；
2. 系统正在处理真实 workflow 中的“变化”；
3. 每项变化与已批准 thesis 发生比较；
4. 用户保留最终判断权；
5. 所有批准后的变化可追踪。

体验应像：

> terminal-like information density × modern enterprise SaaS clarity × investment committee discipline

而不是：

- 消费级 AI 渐变首页；
- 无限空白 chat；
- 炫技式 node graph；
- 模糊的“AI confidence 97.3%”；
- 复杂到无法演示的 Bloomberg 仿制品。

---

## 2. 全局布局

```text
┌──────────────────────────────────────────────────────────────────┐
│ Delphi / Workspace      Search       Demo data   User / Status  │
├───────────────┬──────────────────────────────────────────────────┤
│ Change Inbox  │                                                  │
│ Cases         │                 Main content                     │
│ Ledger        │                                                  │
│ Runs          │                                                  │
│ Trust         │                                                  │
│               │                                                  │
│ ───────────   │                                                  │
│ Demo controls │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

### Sidebar

- 固定宽度，图标 + 文本；
- 当前 route 高亮；
- 显示 `Synthetic demo` badge；
- 底部有 `Reset demo`；
- 不显示无功能的十几个菜单。

### Top bar

- workspace / fund 名；
- global search mock；
- data mode；
- run health；
- user avatar / reviewer role。

---

## 3. 视觉语言

### 色彩语义

| 语义 | 建议 |
|---|---|
| Background | near-black / blue-black |
| Panel | slightly elevated neutral |
| Primary accent | cool cyan / indigo，低饱和 |
| Positive / supported | green，但避免“买入”含义 |
| Negative / contradicted | red / rose |
| Warning / uncertain | amber |
| Informational | blue |
| Approved state | distinct solid badge |
| Agent proposal | outlined / dashed treatment |

状态必须同时有文字或图标，不能只靠颜色。

### Typography

- UI：系统 sans，保证跨平台；
- 数字、版本、ID、事件：monospace；
- 标题克制，不使用超大营销字号；
- 正文 line-height 适合高密度阅读；
- 重要差异用结构和留白，不用彩虹渐变。

### 卡片

- 边框比阴影重要；
- 小圆角；
- hover 只轻微改变边框和背景；
- 支持 split-view；
- source / evidence 使用可折叠 drawer。

---

## 4. Change Inbox

### 信息层级

```text
[Needs review] [High materiality]     14m ago
Archetype Systems — FY26 Q2 Earnings
3 thesis deltas · 1 forecast review · 1 unresolved conflict
Required reviewer: Analyst
```

每项 row / card 需要：

- status；
- company / event；
- workflow；
- materiality；
- proposed changes；
- evidence health；
- reviewer；
- time；
- `Open review` 主动作。

### 筛选

- Needs review；
- Escalated；
- Approved；
- Degraded；
- Company；
- Materiality；
- Date。

默认只显示需要用户动作的内容，避免首页成为信息坟场。

### 空状态

> No material changes need your review.  
> Delphi is monitoring 18 active cases.

避免“Start chatting”。

---

## 5. Investment Case

### Header

- company；
- owner；
- approved version；
- last review；
- status；
- `Compare versions`；
- `Open latest event`。

### Tabs

1. Overview
2. Thesis
3. Forecasts
4. Risks
5. Evidence
6. History

### Thesis pillar card

```text
Pillar 01 · Approved
Enterprise AI infrastructure demand remains durable
Owner: A. Chen · Last approved: Jun 14
Evidence health: 8 supporting / 2 contradicting
```

每个 pillar 有：

- approved statement；
- confidence as team judgment；
- supporting / contradicting evidence；
- latest delta；
- owner；
- version；
- open questions。

不要混合“Agent confidence”与“team conviction”。

---

## 6. Run Observatory

建议使用双栏：

```text
┌──────────────────────────────┬───────────────────────────────┐
│ Runtime timeline             │ Findings / object inspector   │
│ ✓ Sources loaded             │ selected event                │
│ ✓ Facts reconciled           │ source refs                   │
│ ● Thesis impact              │ structured output             │
│ ○ Risk analysis              │ validation state              │
│ ○ Judge                      │ object IDs                     │
└──────────────────────────────┴───────────────────────────────┘
```

### Timeline row

- step name；
- system / agent；
- status；
- duration；
- objects produced；
- expandable metadata。

### 不展示

- hidden chain of thought；
- raw prompt 默认全文；
- fake terminal gibberish；
- 每个 token streaming；
- 对客户没有意义的内部 stack trace。

### 展示

- task；
- tool / source；
- structured finding；
- validator result；
- degraded reason；
- version；
- elapsed time。

---

## 7. Delta Review

### 页面顶部

- event summary；
- current approved version；
- proposed version；
- run state；
- evidence health；
- outstanding conflicts；
- required reviewer。

### Delta card anatomy

```text
[Thesis pillar] [Weakens] [High materiality]

Demand durability is less certain in the mid-market segment

WHAT CHANGED
Net retention fell below the team’s expected range...

AGAINST OUR VIEW
The approved thesis assumes...

WHY IT MATTERS
This reduces confidence in...

EVIDENCE
[Q2 shareholder letter §3] [Call transcript 12:41]

UNKNOWN
Whether weakness reflects temporary implementation delays...

RECOMMENDED
Revisit FY27 net retention assumption.

[Accept] [Edit] [Reject] [Escalate] [Defer]
```

### Action behavior

#### Accept

Modal:

```text
This will:
• update Thesis Pillar 02
• create version v13
• record you as reviewer
• retain the original proposal and evidence
```

主按钮：`Approve and record`

#### Edit

- inline structured editor；
- agent original visible in collapsible area；
- difference preview；
- edit reason optional but encouraged；
- approved record attributes judgment to user。

#### Reject

Reason chips：

- not material；
- incorrect evidence；
- duplicate；
- wrong interpretation；
- already reflected；
- insufficient evidence；
- other。

#### Escalate

- select PM；
- add note；
- preserve due date；
- does not update formal state。

#### Defer

- choose date / event trigger；
- remains in queue；
- no state mutation。

---

## 8. Evidence Drawer

展示：

- source title；
- document type；
- published_at；
- observed_at；
- data classification；
- exact excerpt；
- page / section / timestamp；
- source version / hash；
- supports / contradicts relation；
- numeric extraction；
- license / access indicator mock。

用户应能从 delta 一键打开精确证据，而不是只看到来源首页。

---

## 9. Decision Ledger

### 列表

高密度表格适合：

```text
Time | Case | Transition | Actor | Evidence | Workflow | Status
```

### 详情

四个区块：

1. **State diff**
2. **Evidence lineage**
3. **Approval & responsibility**
4. **Execution & privacy metadata**

### Diff 表达

```diff
- Mid-market demand remains resilient
+ Mid-market demand remains resilient, but implementation delays
+ create a material downside risk for FY27 net retention
```

同时显示结构化字段，不只显示文字 diff。

---

## 10. Trust / Privacy Receipt

对每次 run 显示：

```text
Workflow: Earnings-to-Thesis v0.2.0
Data classification: Synthetic demo
Execution location: Local demo runtime
Model endpoint: Fixture adapter
Raw content sent to Delphi Cloud: No
External web access: Disabled
Tools called: fixture.read, thesis.read, validator.run
Canonical writes: 2 proposed, 1 human-approved
Support access: None
```

该页面既服务客户，也向 EFL 证明安全是架构属性而非脚注。

---

## 11. Degraded 与错误状态

### Degraded banner

> Analysis completed with gaps. The earnings call transcript was unavailable, so management-guidance interpretation is not proposed for approval.

### 禁止的错误处理

- 静默隐藏；
- 自动用新闻替代 transcript 而不说明；
- 把未验证 section 填满；
- 只显示 “Something went wrong”；
- run 失败后丢失已完成发现。

### 恰当行为

- 保留部分结果；
- 标记受影响对象；
- 禁止不安全 approval；
- 给出 retry / escalate / inspect source；
- 记录完整 degraded reason。

---

## 12. 响应式

### Desktop

- full sidebar；
- split view；
- evidence drawer；
- table。

### Tablet

- compact sidebar；
- delta 与 evidence 可切换；
- 保留审批动作。

### Mobile

营销网站需要完整适配；产品原型只需能查看，不要求移动端完成复杂 review。

---

## 13. 动效

- runtime event 逐项出现；
- status transition 使用 150–250ms；
- Ledger 更新后短暂强调新行；
- drawer 与 modal 平滑但克制；
- 支持 `prefers-reduced-motion`；
- 不用持续闪烁的 Agent “思考”动画。

---

## 14. 页面文案语气

使用：

- precise；
- calm；
- accountable；
- evidence-first；
- boundary-aware。

避免：

- magical；
- autonomous；
- revolutionary；
- guaranteed；
- superhuman；
- replacement；
- “AI has decided”。

推荐：

- `Delphi proposes`
- `Evidence supports`
- `Evidence is insufficient`
- `Analyst approved`
- `Recorded in the Decision Ledger`
- `Requires PM review`

---

## 15. 网站截图计划

原型完成后，网站至少使用以下真实产品截图：

1. Change Inbox；
2. Delta Review；
3. Evidence Drawer；
4. Decision Ledger state diff；
5. Run Observatory；
6. Privacy Receipt。

不要用抽象 3D 球体代替产品证据。

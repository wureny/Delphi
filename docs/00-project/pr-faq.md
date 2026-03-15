# PR/FAQ

这份文档用于 Working Backwards。假设项目已经成功发布，倒推应该成立什么。

## Press Release

### Headline

- Delphi 发布 v0：把美股个股研究变成一个可观察、可追踪的多 agent AI 工作流

### Subheadline

- 用户不再只得到一份“一次性分析文本”，而是得到一个带有 thesis、evidence、risk、liquidity context 和 reasoning trace 的结构化 investment case。

### Problem

- 用户过去面对个股判断时，需要在价格、新闻、财报、宏观和市场预期之间来回切换，自己完成研究整合，效率低且难以持续更新。
- 现有方案要么是人工流程过重，要么是单次 AI 生成过轻。前者慢，后者缺结构、缺 trace、缺上下文连续性。

### Solution

- Delphi 将一个自然语言股票问题拆成结构化 research query，并由 Thesis、Liquidity、Market Signal、Judge 四个固定 agent 协作完成分析。
- 系统不直接把模型输出当答案，而是先生成 findings、graph patch 和 decision trace，再形成最终报告。
- AI / agent 是关键能力，因为核心价值不是展示数据，而是组织研究、分工解释、汇总判断。

### User Quote

> 以前我会得到一份看起来很聪明的分析文字，但很难知道为什么是这个结论。现在我能看到 thesis、evidence、liquidity context 和风险是怎么被一步步组织出来的。

### Project / Team Quote

> Delphi v0 不是要替代专业投资机构，而是要证明：investment case 可以成为 AI-native 产品中的一等对象，而不是一次性文本的副产物。

### What Is New

- 单个美股问题可以跑通完整多 agent 研究闭环
- 用户可同时看到最终报告与真实运行过程
- ontology 与 bounded context graph 成为系统级约束，而不是概念展示

## FAQ

### Who is this for?

- 有一定金融基础、希望快速形成结构化个股判断的个人研究者
- 对 agentic research 和 AI-native investing 感兴趣的 builder / researcher

### Why now?

- 大模型已经足以支持多步骤研究任务自动化，但大多数产品还停留在“单次问答”层面。
- 对 ontology、context graph、agent memory 的讨论很多，但缺少一个聚焦、可运行、可展示的具体原型。

### Why is this meaningfully better than alternatives?

- 比传统人工研究更快
- 比单次 AI 报告更结构化、更可追踪
- 比纯资讯聚合工具更接近真正的 research workflow

### What is the hardest technical challenge?

- 如何让 runtime graph 自构建但仍受边界约束
- 如何让右侧 canvas 展示真实状态，而不是前端假动画
- 如何保证 Judge 输出与 findings 真正对齐

### What needs to be true for this to work?

- 固定 4 agent 的职责必须清楚
- graph patch + validator 必须稳定
- final report contract 必须固定
- 至少一条 gold demo 路径要稳定可复现

### What are the biggest risks?

- 过度建模导致项目拖死
- 过度追求“agent 感”而损伤产品体验
- 多数据源接入过早导致稳定性下降
- 最终结果和过程层脱节

### What will the first demo / milestone include?

- 一个双栏 Web 原型
- 单一美股 query 的完整运行闭环
- 4 个固定 agent 的可观察执行过程
- 六段固定结构的最终报告

# GitHub Issue 规范与模板（v0.1）

## 1. 创建顺序
1. 先建 Epic（目标与范围）。
2. 再建 Story（可交付能力）。
3. 最后建 Task（具体实现）。

## 2. 编号建议
- Epic: `E-A`, `E-B`, `E-C`
- Story: `S-A1`, `S-A2`
- Task: `T-A1-1`, `T-A1-2`

## 3. Issue 标题规范
格式：`[Type][Area] 简短动作 + 对象`
示例：
1. `[Epic][Ontology] 定义 Polymarket 核心本体模型`
2. `[Story][Mapping] 完成 Market -> Ontology 字段映射表`
3. `[Task][Validation] 增加 Outcome 完整性校验规则`

## 4. 必填字段
1. 背景/目标
2. 范围（In scope）
3. 非范围（Out of scope）
4. 验收标准（可勾选）
5. 依赖与阻塞项
6. 预计工作量（T-shirt size 或天数）

## 5. issue 到文档的映射
1. PRD 需求编号写入 issue。
2. issue 完成后反向更新文档状态。
3. 所有关键决策写入 `plans/decisions`。

## 6. 建议节奏
1. 每周规划 1 次：确认本周要完成的 issue。
2. 每天更新 1 次：记录状态、风险、下一步。
3. 每周复盘 1 次：关闭 milestone 或下调范围。

# Core Interface Contract

这份文档锁定 v0 的 6 个内部核心接口。后续实现 agent、graph writer、UI 和 eval 应优先遵循这里，而不是临时发明字段。

补充说明：

- v0 orchestration contract 统一以 `run_id` 为唯一 runtime 作用域
- `session_id` 若存在，只属于应用层或数据层元数据，不进入这里的核心 runtime interface

## 1. ResearchQuery

代表用户发起的一次研究请求。

### Required fields

- `query_id`
- `user_question`
- `ticker`
- `time_horizon`
- `case_type`
- `created_at`

### Notes

- `ticker` 必须是单一美股标的
- `case_type` v0 可以简单枚举为：
  - `buy_decision`
  - `risk_reward_check`
  - `priced_in_check`
  - `event_driven_view`

## 2. AgentTask

代表一次分配给某个 agent 的执行任务。

### Required fields

- `task_id`
- `run_id`
- `agent_type`
- `goal`
- `input_refs`
- `status`
- `priority`

### Allowed status

- `created`
- `running`
- `waiting`
- `done`
- `failed`
- `degraded`

## 3. Finding

代表 agent 产出的最小研究结论单元。

### Required fields

- `finding_id`
- `run_id`
- `task_id`
- `agent_type`
- `claim`
- `evidence_refs`
- `object_refs`
- `confidence`
- `impact`
- `timestamp`

### Rules

- `claim` 必须可被人类读懂
- `object_refs` 应指向当前 case 的稳定对象或当前 run 的 runtime 对象
- `evidence_refs` 可以为空，但若为空必须标注低置信度
- `impact` 建议用 `positive / neutral / negative / mixed`

### Optional lineage metadata

- `object_refs` 在 v0 中可进一步作为 Judge / report 的 stable-object lineage 输入
- 当 `object_refs` 指向稳定对象时，runtime 可据此补 `Finding -UPDATES-> stable object`

## 4. GraphPatch

代表 agent 对图层提出的结构化写入请求。

### Required metadata

- `patch_id`
- `run_id`
- `agent_type`
- `target_scope`
- `basis_refs`
- `operations[]`

### Allowed `target_scope`

- `runtime`
- `case`

### Allowed operations

- `create_node`
- `merge_node`
- `create_edge`
- `update_property`
- `attach_evidence`
- `summarize_subgraph`

### Operation base fields

每个 operation 至少包含：

- `op_id`
- `type`

### Operation shapes

#### `create_node`

- `node_ref`
- `node_type`
- `properties`

#### `merge_node`

- `resolved_ref`
- `node_type`
- `match_keys`
- `properties`

#### `create_edge`

- `edge_type`
- `from_ref`
- `to_ref`
- `properties`

#### `update_property`

- `target_ref`
- `properties`
- `merge_strategy`

#### `attach_evidence`

- `target_ref`
- `evidence_ref`
- `relation_type`

#### `summarize_subgraph`

- `target_ref`
- `summary`
- `source_refs`

### Hard constraints

- 不允许原始 Cypher 直写
- 不允许超出当前 run scope
- 不允许使用未注册 label / edge type
- `case` scope patch 只能触达当前 `InvestmentCase` 锚定对象

## 5. RunEvent

代表发给 UI 的实时状态事件。

### Required fields

- `event_id`
- `run_id`
- `agent_id`
- `event_type`
- `title`
- `payload`
- `ts`

### Expected event types

- `run_created`
- `planner_completed`
- `task_assigned`
- `tool_started`
- `tool_finished`
- `finding_created`
- `patch_accepted`
- `patch_rejected`
- `judge_synthesis_started`
- `agent_completed`
- `agent_failed`
- `degraded_mode_entered`
- `report_ready`

### Notes

- 所有 `RunEvent` 都必须是 run-scoped
- UI 只消费 `RunEvent`，不依赖 runtime 内存中的隐式状态

## 6. FinalReport

代表用户最终看到的结构化研究结论。

### Required fields

- `report_id`
- `run_id`
- `case_id`
- `generated_by`
- `generated_at`
- `final_judgment`
- `core_thesis`
- `supporting_evidence`
- `key_risks`
- `liquidity_context`
- `what_changes_the_view`
- `section_citations`

### Required sections

- `final_judgment`
- `core_thesis`
- `supporting_evidence`
- `key_risks`
- `liquidity_context`
- `what_changes_the_view`

### Rules

- Judge 是唯一允许生成 `FinalReport` 的 agent
- `section_citations` 至少要让每个 section 回指到若干 `Finding`
- 最终报告中的核心判断应能回指至少一部分 findings
- 结构顺序固定，便于评估和 UI 渲染
- 对应的 runtime `ReportSection` 固定为 6 个 section 节点，即使内容为空也保留

### Optional lineage metadata

- `Decision` 可额外携带 `updated_object_refs`
- `ReportSection` 可额外携带 `citation_object_refs`
- `FinalReport` 可额外携带：
  - `updated_object_refs`
  - `section_object_refs`
  - `updated_object_types`

这些字段不是 v0 的必填接口，但允许 Judge / UI / eval 更明确知道本轮 run 更新了哪些稳定对象

## 7. Compatibility Policy

- 新增字段允许，但必须保持向后兼容
- 删除必填字段或改变枚举语义，需要新增 ADR
- UI、runtime、eval 三侧都必须以这里为接口基准

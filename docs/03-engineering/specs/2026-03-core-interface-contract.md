# Core Interface Contract

这份文档锁定 v0 的 6 个内部核心接口。后续实现 agent 应优先遵循这里，而不是临时发明字段。

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
- `agent_type`
- `claim`
- `evidence_refs`
- `confidence`
- `impact`
- `timestamp`

### Rules

- `claim` 必须可被人类读懂
- `evidence_refs` 可以为空，但若为空必须标注低置信度
- `impact` 建议用 `positive / neutral / negative / mixed`

## 4. GraphPatch

代表 agent 对图层提出的结构化写入请求。

### Allowed operations

- `create_node`
- `merge_node`
- `create_edge`
- `update_property`
- `attach_evidence`
- `summarize_subgraph`

### Mandatory metadata

- `run_id`
- `agent_type`
- `target_scope`
- `operations[]`

### Hard constraints

- 不允许原始 Cypher 直写
- 不允许超出当前 run scope
- 不允许使用未注册 label / edge type

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
- `task_assigned`
- `tool_started`
- `tool_finished`
- `finding_created`
- `patch_accepted`
- `patch_rejected`
- `agent_completed`
- `agent_failed`
- `report_ready`

## 6. FinalReport

代表用户最终看到的结构化研究结论。

### Required sections

- `final_judgment`
- `core_thesis`
- `supporting_evidence`
- `key_risks`
- `liquidity_context`
- `what_changes_the_view`

### Rules

- Judge 是唯一允许生成 `FinalReport` 的 agent
- 最终报告中的核心判断应能回指至少一部分 findings
- 结构顺序固定，便于评估和 UI 渲染

## 7. Compatibility Policy

- 新增字段允许，但必须保持向后兼容
- 删除必填字段或改变枚举语义，需要新增 ADR
- UI、runtime、eval 三侧都必须以这里为接口基准

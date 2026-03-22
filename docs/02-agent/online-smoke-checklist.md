# Online Smoke Checklist

这份清单不是大而全 eval，而是答辩前 5-10 分钟内可重复执行的线上 smoke / demo / regression 基线。

目标只覆盖最容易翻车的路径：

1. `POST /runs` 能创建 run
2. `/runs/:runKey/events` SSE 有事件
3. `/runs/:runKey/terminal-stream` SSE 有 chunk
4. `/runs/:runKey/report` 返回固定 6 sections
5. OpenBB 失败时 run 进入 `degraded`
6. graph patch / graph writer 失败时 run 进入 `degraded`

## 1. Current Boundary

- 已可直接验证：
  - runtime API
  - OpenBB adapter
  - Neo4j Aura write path
  - terminal stream / report snapshot contract
- 当前**不能假装已验证**：
  - Supabase 真写入健康度

仓库里还没有直接写 Supabase 的实现，所以这份 smoke checklist 不能把 Supabase 标成已覆盖。

## 2. Minimal Queries

### Gold Demo Query

- query:
  - `AAPL 未来三个月值不值得买？`
- 目的：
  - 验证创建 run、SSE 事件、terminal chunk、6-section report 都正常
- 通过标准：
  - run 最终 `status=completed`
  - 至少出现 `run_created`
  - 至少出现 `planner_completed`
  - 至少出现 `report_ready`
  - terminal stream 至少 1 个 chunk
  - report snapshot 恰好 6 个 section
  - 没有 `degraded_mode_entered`
  - 没有 `patch_rejected`

### Degraded Query

- query:
  - 同样使用 `AAPL 未来三个月值不值得买？`
- 触发方式：
  - 通过受控 smoke fault injection，让 OpenBB 路径失败
- 目的：
  - 验证外部数据源失败时不是整次崩溃，而是 `degraded`
- 通过标准：
  - run 最终 `status=degraded`
  - 至少出现 `degraded_mode_entered`
  - 仍然出现 `report_ready`
  - `degraded_mode_entered` event payload 或相关错误文本包含 `OpenBB`

### Graph Write Verification

- 不走前端
- 直接跑真实 Aura smoke write
- 目的：
  - 快速确认 Railway backend 之外，Aura 本身可连、可写、可查
- 通过标准：
  - patch 被接受
  - 回查能读到刚写入的 case / asset / thesis 三元组

### Terminal Stream Verification

- 使用和 gold 相同 query
- 单独强调：
  - `/terminal-stream` 至少返回 1 个 chunk
  - 最好能看到多个 agent 的 chunk，而不是只有 `run_created`

## 3. Commands

### Runtime Gold

```bash
RUNTIME_SMOKE_BASE_URL=https://<railway-backend> npm run runtime:smoke:gold
```

### Runtime OpenBB Degraded

前提：部署环境显式开启以下环境变量：

```bash
RUNTIME_SMOKE_FAIL_OPENBB_RUN_KEYS=smoke_openbb_degraded
```

然后运行：

```bash
RUNTIME_SMOKE_BASE_URL=https://<railway-backend> npm run runtime:smoke:openbb-degraded
```

### Runtime Graph Degraded

前提：部署环境显式开启以下环境变量：

```bash
RUNTIME_SMOKE_FAIL_GRAPH_WRITE_RUN_KEYS=smoke_graph_degraded
```

然后运行：

```bash
RUNTIME_SMOKE_BASE_URL=https://<railway-backend> npm run runtime:smoke:graph-degraded
```

### OpenBB Direct Smoke

```bash
npm run openbb:smoke
```

### Aura Direct Smoke Write

```bash
npm run neo4j:smoke-write
```

## 4. What Each Check Localizes

### Gold Fails Before `run_created`

- 优先怀疑：
  - Railway backend 没起来
  - 路由 / CORS / deployment URL 错

### `run_created` 有，但 `/events` 没消息

- 优先怀疑：
  - SSE transport
  - Railway response buffering / proxy behavior
  - 前端 live runtime URL 指向错误

### `/events` 有，但 `/terminal-stream` 没 chunk

- 优先怀疑：
  - terminal chunk 派生逻辑
  - runtime event -> terminal stream bridge

### report 不是 6 sections

- 优先怀疑：
  - judge synthesis 输出
  - report normalization
  - frontend / backend contract 漂移

### OpenBB Degraded 用例没进入 `degraded`

- 优先怀疑：
  - degraded contract 断了
  - data adapter failure 没有被 runtime 捕获并转成 `degraded_mode_entered`

### Graph Degraded 用例没出现 `patch_rejected`

- 优先怀疑：
  - graph writer failure 没透传
  - patch rejection 没进事件流

### `neo4j:smoke-write` 失败，但 runtime gold 能跑

- 说明：
  - 前端和 runtime 可能还活着
  - 但 Aura 写图链路不健康

### `openbb:smoke` 失败，但 runtime gold 还能跑

- 说明：
  - 当前 runtime 可能没走 OpenBB，或命中了 fixture / 缓存 / 非 production 路径
  - 这时不能把“OpenBB healthy”算通过

## 5. Answering The Defense Question Quickly

答辩前只看这 4 组结果：

1. `runtime:smoke:gold`
2. `runtime:smoke:openbb-degraded`
3. `runtime:smoke:terminal`
4. `neo4j:smoke-write`

可得到的判断：

- 前端 / runtime 基本健康：
  - gold 通过，terminal 通过
- OpenBB 基本健康：
  - `openbb:smoke` 通过，且 gold 没意外 degraded
- Aura 基本健康：
  - `neo4j:smoke-write` 通过
- degraded contract 基本健康：
  - `runtime:smoke:openbb-degraded` 或 `runtime:smoke:graph-degraded` 通过

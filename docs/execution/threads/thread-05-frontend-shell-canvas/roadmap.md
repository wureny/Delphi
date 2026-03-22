# Thread 05 Roadmap

## Mission

- 把 Delphi v0 的“左结果、右过程”做成真实可消费的前端壳层。
- 前端只消费稳定合同，不反向推动 runtime 为 UI 改协议。
- 前端部署目标是 Vercel，但前端不是执行层，只直连 runtime API / streams。

## Workstreams

### 1. Frontend Logic

- 建立前端摄取层：
  - recorded runtime fixture
  - browser-to-Railway live adapter
- 保留原始 runtime 合同输入：
  - `RunEvent[]`
  - report snapshot
  - terminal snapshot / terminal stream
- 用 selector 把合同映射成：
  - `RunViewState`
  - `AgentCardState`
  - `ReportViewState`
  - `EventTimelineState`
- terminal body 只由 terminal snapshot / terminal chunks 驱动，前端不编造 agent 动作

### 2. UI Shell

- 双栏布局
- 左侧：
  - query composer
  - run status strip
  - degraded banner
  - fixed 6-section report
- 右侧：
  - fixed 4 agent cards
  - recent event timeline
  - collapse / expand rail
- 首屏优先稳定：
  - 先挂出 shell / status / empty terminal state
  - 再渐进补 report snapshot、events、terminal chunks
- degraded / failed / interrupted 需要明确用户可读提示
- 右侧 terminal card 保持 terminal-like，不是 PTY，也不是日志墙

### 3. Runtime Integration

- 以 backend contract 为准：
  - `POST /runs`
  - `GET /runs/:runKey/report`
  - `GET /runs/:runKey/events`
  - `GET /runs/:runKey/terminals`
  - `GET /runs/:runKey/terminal-stream`
- 数据来源边界：
  - 左侧报告来自 report snapshot
  - 右侧状态来自 runtime events
  - 右侧终端正文来自 terminal snapshot / terminal stream
- `report_ready` 只视为报告已可请求，不假设事件里已经携带完整 `FinalReport`
- Vercel 前端优先浏览器直连 Railway runtime，不先做 Vercel server route 的 SSE 代理
- 必须预留 `NEXT_PUBLIC_RUNTIME_API_BASE_URL`

## Sequencing

1. 保持 recorded runtime fixture 可持续导出，作为 demo fallback
2. 落 run 创建后的页面状态切换
3. 接 report snapshot、events、terminals、terminal-stream 的协同渲染
4. 补 SSE 中断、失败、degraded 的 UI 表达
5. 对齐 Vercel 部署入口和 runtime base URL 注入
6. 补 thread5 docs、handoff、integration asks
7. 构建与部署验证

## Current Decisions

- 第一版前端不引入 React / Vite，先用无额外依赖的 TypeScript + HTML/CSS 壳层把合同消费层做实
- recorded 模式必须明确标注为 demo replay，不能伪装成 live backend
- 如果显式选择 SSE 但没有提供 `events` endpoint，前端直接报缺失，不回退到 recorded 模式
- Vercel 前端不直接接 OpenBB、Supabase service role、Neo4j
- 浏览器优先直连 Railway runtime，避免先引入 Vercel 侧 SSE 代理复杂度
- backend 可能较慢，UI 以“清晰、稳定、渐进补齐”为先

## Requests To Thread4

- 当前 backend contract 已对齐：
  - `POST /runs`
  - `GET /runs/:runKey/report`
  - `GET /runs/:runKey/events`
  - `GET /runs/:runKey/terminals`
  - `GET /runs/:runKey/terminal-stream`
- 若 contract 继续演进，要保持：
  - report snapshot 与 terminal snapshot 可独立 hydration
  - `report_ready` 与 report snapshot 不产生 race
  - terminal stream chunk 能稳定按 agent 追加

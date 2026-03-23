# Thread 05 Handoff

## What Changed

- 新增 `frontend/` 前端壳层：
  - `index.html`
  - `styles.css`
  - `src/` 下 feed / state / render / app 逻辑
- 新增 runtime demo fixture 导出脚本：
  - `scripts/export-runtime-demo-fixture.ts`
- 新增本地静态服务脚本：
  - `scripts/serve-frontend.ts`
- 新增前端构建配置：
  - `tsconfig.frontend.json`
- 新增 npm scripts：
  - `frontend:demo:record`
  - `frontend:build`
  - `frontend:serve`
  - `frontend:typecheck`
  - `dev:live`
- 已把 thread5 前端接到 thread4 live runtime bridge：
  - live mode 现在走 `POST /runs -> GET /runs/:runKey/terminals -> GET /runs/:runKey/report -> GET /runs/:runKey/events -> GET /runs/:runKey/terminal-stream`
  - 若 URL 显式传 `run`，前端会根据 `runtime + run` 自动推导既有 run 的 events/report endpoints

## Decisions Made

- 第一版不用 React / Vite，先确保事件驱动壳层真实可跑
- recorded mode 明确标注为 replay，不伪装成 live backend
- SSE mode 若缺少 `events` endpoint，直接报错，不回退到 recorded
- live mode composer 已恢复可编辑，并真实提交 `POST /runs`
- live mode 默认不再隐式重连 `demo`；没有 `run` 参数时保持空闲态，等待用户提交问题
- 右侧 terminal summary 仍由 `RunEvent` 驱动，但 transcript body 已切到 thread4 的 terminal snapshot + terminal stream
- terminal canvas 的产品定位是“受控 runtime terminal”，不是开发者 PTY / web shell
- 目标部署平台是 Vercel，但前端不是执行层；默认设计为浏览器直连 Railway runtime
- 当部署环境提供 `NEXT_PUBLIC_RUNTIME_API_BASE_URL` 时，页面默认进入 live mode；需要 recorded demo 时用 `?source=recorded`
- 最新 UI 方向已经从 dashboard-like shell 往 chat-first layout 收：
  - 左边是简化 conversation + composer + structured output
  - 左侧窄栏承接 runtime log
  - 右边是固定 4 terminal-like cards 的整齐工作台
- 固定 agent 顺序：
  - thesis
  - liquidity
  - market_signal
  - judge
- 固定 section 顺序：
  - final_judgment
  - core_thesis
  - supporting_evidence
  - key_risks
  - liquidity_context
  - what_changes_the_view

## Risks / Open Questions

- 当前 `RunEvent.payload` 仍是弱类型 `Record<string, unknown>`；前端已经做 narrowing，但未来最好补 stronger typing
- `report_ready` 只带 `reportId`，所以 live 模式必须配合 snapshot/report endpoint
- 当前前端 live submit 只提交 `query.userQuestion`；如果后续想减少后端推断不确定性，可以再显式补 `ticker / timeHorizon / caseType`
- recorded fixture 已升级为真实 terminal chunk 导出；如果 fixture shape 再变，需要同步 `frontend/src/feeds.ts`
- 当前 demo runtime 实际上是顺序执行 non-judge agents；UI 没有假设强并发，但答辩展示时要注意解释
- Vercel 部署还没对齐：
  - 还没有专门验收 Railway 直连 SSE 在 Vercel 浏览器环境下的断流 / 重连表达
  - Railway runtime 还需要把 `CORS_ORIGIN` 配到 Vercel 前端域名
- 当前线上 runtime 自身还有真实 blocker：
  - thesis / liquidity / market_signal 的数据抓取会 `fetch failed`
  - judge 当前使用的 OpenAI key 不正确
  - 所以前端即便联通，也会看到 failed / degraded / empty report
- 若用户坚持“真实 Mac 终端 + agent 在终端里执行”，则需要新增后端能力：
  - per-agent terminal stream
  - browser terminal transport
  - 明确的 PTY / pseudo-terminal security boundary

## Next Recommended Consumer

- thread5 frontend owner：
  - 补 run 创建后的页面状态切换和 SSE 中断时的明确 UI 文案
  - 继续保证左侧只吃 report snapshot、右侧状态只吃 events、右侧正文只吃 terminal transport
  - 若后续想收更稳的 query 质量，可在 composer 旁补显式 ticker / horizon / caseType controls
  - 若后续要把 terminal 做得更像产品而不是工程台，优先收滚动体验、terminal density 和 section-to-terminal 的 cross-highlight
  - 若要做真实终端，不要在前端伪装，需要 thread4 / backend 先给 PTY 级 terminal stream 能力

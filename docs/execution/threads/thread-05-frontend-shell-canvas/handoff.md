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
  - live mode 现在走 `POST /runs -> GET /runs/:runKey/report -> GET /runs/:runKey/events`
  - 若 URL 显式传 `run`，前端会根据 `runtime + run` 自动推导既有 run 的 events/report endpoints

## Decisions Made

- 第一版不用 React / Vite，先确保事件驱动壳层真实可跑
- recorded mode 明确标注为 replay，不伪装成 live backend
- SSE mode 若缺少 `events` endpoint，直接报错，不回退到 recorded
- live mode composer 已恢复可编辑，并真实提交 `POST /runs`
- live mode 默认不再隐式重连 `demo`；没有 `run` 参数时保持空闲态，等待用户提交问题
- 右侧 terminal 使用真实 `RunEvent` transcript 渲染；当前不伪装成已接入 PTY 的真实交互 shell
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
- 当前 demo runtime 实际上是顺序执行 non-judge agents；UI 没有假设强并发，但答辩展示时要注意解释
- 当前沙箱无法监听本地端口，浏览器级验证还没在这个环境完成
- 若用户坚持“真实 Mac 终端 + agent 在终端里执行”，则需要新增后端能力：
  - per-agent terminal stream
  - browser terminal transport
  - 明确的 PTY / pseudo-terminal security boundary

## Next Recommended Consumer

- thread5 frontend owner：
  - 若后续想收更稳的 query 质量，可在 composer 旁补显式 ticker / horizon / caseType controls
  - 若要做真实终端，不要在前端伪装，需要 thread4 / backend 先给 terminal stream 能力

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

## Decisions Made

- 第一版不用 React / Vite，先确保事件驱动壳层真实可跑
- recorded mode 明确标注为 replay，不伪装成 live backend
- SSE mode 若缺少 `events` endpoint，直接报错，不回退到 recorded
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
- 当前 demo runtime 实际上是顺序执行 non-judge agents；UI 没有假设强并发，但答辩展示时要注意解释
- 当前沙箱无法监听本地端口，浏览器级验证还没在这个环境完成
- 若用户坚持“真实 Mac 终端 + agent 在终端里执行”，则需要新增后端能力：
  - per-agent terminal stream
  - browser terminal transport
  - 明确的 PTY / pseudo-terminal security boundary

## Next Recommended Consumer

- thread4 runtime / integration owner：
  - 提供 SSE events endpoint
  - 提供 report snapshot endpoint
  - 确认 recorded fixture 导出路径和 shape 可以持续稳定

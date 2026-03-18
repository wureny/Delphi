# Thread 05 Roadmap

## Mission

- 把 Delphi v0 的“左结果、右过程”做成真实可消费的前端壳层。
- 前端只消费稳定合同，不反向推动 runtime 为 UI 改协议。

## Workstreams

### 1. Frontend Logic

- 建立前端摄取层：
  - recorded runtime fixture
  - future SSE adapter placeholder
- 保留原始 `RunEvent[]`
- 用 selector 把事件流映射成：
  - `RunViewState`
  - `AgentCardState`
  - `ReportViewState`
  - `EventTimelineState`

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

### 3. Runtime Integration

- 先吃 recorded fixture
- 再接 SSE
- `report_ready` 只视为报告已可请求，不假设事件里已经携带完整 `FinalReport`

## Sequencing

1. 生成 recorded runtime fixture
2. 落前端状态层和 feed adapters
3. 搭左 report / 右 canvas UI
4. 补 thread5 docs、handoff、integration asks
5. 构建验证

## Current Decisions

- 第一版前端不引入 React / Vite，先用无额外依赖的 TypeScript + HTML/CSS 壳层把合同消费层做实
- recorded 模式必须明确标注为 demo replay，不能伪装成 live backend
- 如果显式选择 SSE 但没有提供 `events` endpoint，前端直接报缺失，不回退到 recorded 模式

## Requests To Thread4

- 稳定的 SSE events endpoint 形状：
  - `/runs/:id/events` -> stream `RunEvent`
- 稳定的 report snapshot endpoint 形状：
  - `/runs/:id/report` -> `{ run, reportSections, finalReport }`
- 若 endpoint 还没准备好，至少保持 recorded fixture 可以持续从 runtime 重新导出

# Thread 02 Notes

- v0 采用 case-centered ontology，不做 asset-centered 的全市场知识图。
- `InvestmentCase` 是稳定层聚合中心，`Asset` 只是锚点。
- runtime 允许引用稳定层，但稳定层不反向依赖 runtime。
- `GraphPatch` 强制分成 `runtime` 和 `case` 两类 scope，避免一次 patch 同时乱改两层。
- OpenBB 等外部数据先进入 snapshot / normalization，再映射成 `Evidence`、`MarketSignal`、`LiquidityFactor` 等对象。
- 暂不引入 `Reflection`、memory compression、动态 schema 扩展。

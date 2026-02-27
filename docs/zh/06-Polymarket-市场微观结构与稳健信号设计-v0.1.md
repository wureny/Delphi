# Polymarket 市场微观结构与稳健信号设计（v0.1）

## 1. 为什么要新增这一层
Delphi 之前的 Polymarket ontology 主要解决了 `Event / Market / Outcome` 的语义建模问题，但这还不够。

如果目标是让 Agent 更好地理解真实世界，至少要处理两类不同的信息：
1. 市场在讨论什么现实世界命题。
2. 当前盘口与成交是如何把这个命题映射成价格/概率的。

对于 `crypto` 和 `finance`，第二类尤其重要。因为这两个类别经常有：
1. 盘口很浅。
2. 顶档挂单很小。
3. 单笔小额成交就能让页面概率大幅跳动。
4. 某些报价变化并不代表真实世界信息更新，只代表短期簿记结构变化。

因此，Delphi 不应该让 Agent 直接把“显示概率”当作“真实世界概率”。

## 2. 官方文档给出的事实基础
基于 Polymarket 官方文档，以下是本设计直接采用的事实：
1. `Market` 是 Polymarket 的基础可交易单元，每个 market 是一个二元 Yes/No 问题。
2. `Event` 是容器，可以包含一个或多个 market。
3. 只有 `enableOrderBook=true` 的 market 才能通过 CLOB 交易。
4. WebSocket `market` channel 会提供：
   - `book`
   - `price_change`
   - `last_trade_price`
   - `best_bid_ask`
   - `tick_size_change`
5. 用户端显示概率与订单簿相关。根据 Polymarket 的用户文档，显示概率通常使用 bid-ask midpoint；当 spread 大于 10c 时，使用 last trade 价格。

上面这些是官方资料中的直接事实。

## 3. 关键判断
下面这部分是 Delphi 的设计判断，不是官方文档原话：
1. 对于浅盘口市场，midpoint 很容易被很小的挂单影响。
2. 对于宽价差市场，last trade 也可能被极小成交扭曲。
3. 因此，单一“当前价格”不能直接作为 Agent 的唯一市场信号。
4. Agent 需要同时看到：
   - 市场语义
   - 当前盘口结构
   - 最近成交确认度
   - 一个更稳健的派生概率估计

## 4. 三层设计
### 4.1 语义层
回答：这个市场在讨论什么现实世界命题？

核心实体：
- `Event`
- `Market`
- `Outcome`
- `NewsSignal`
- `ResolutionState`

这一层服务于世界理解，不直接回答“当前盘口是否可靠”。

### 4.2 微观结构层
回答：当前价格是怎么形成的？

新增实体：
- `OrderBookSnapshot`
- `TradePrint`
- `LiquiditySnapshot`

其中：
1. `OrderBookSnapshot` 保留 top-N 档位、best bid/ask、spread、midpoint、depth。
2. `TradePrint` 记录真实成交，而不是挂单意图。
3. `LiquiditySnapshot` 保留市场整体流动性和 24h volume。

这一层服务于价格形成过程理解。

### 4.3 派生分析层
回答：当前价格是否足够可信，适合拿来影响决策？

新增实体：
- `MarketMicrostructureState`

它不是 raw ontology 事实，而是基于微观结构数据计算出来的派生状态。

## 5. 为什么 `MarketMicrostructureState` 必须存在
如果只有 `PricePoint`，Agent 很容易直接把这个点当成“市场意见”。

但真实情况是：
1. 一个 0.49 / 0.51 的盘口和一个 0.10 / 0.90 的盘口，对应的可交易性完全不同。
2. 一个由大深度支撑的 0.62 和一个由一笔小挂单顶出来的 0.62，语义完全不同。
3. 一个刚刚有大额成交确认的价格，和一个只存在于顶档挂单上的价格，也不应该被同等对待。

因此我们新增：
- `displayed_probability`
- `robust_probability`
- `book_reliability_score`
- `manipulation_risk_score`
- `depth_imbalance`
- `quote_trade_divergence`
- `explanatory_tags`

让 Agent 先判断“这个市场价格当前值是否值得相信”，再决定是否把它拿来更新对真实世界的理解。

## 6. 计算框架
下面是建议的 v0 分析框架。

### 6.1 输入
来自 Gamma / CLOB / WebSocket：
- `best_bid`
- `best_ask`
- `spread`
- `tick_size`
- top-N `bid_levels`
- top-N `ask_levels`
- `last_trade_price`
- `last_trade_size`
- 最近窗口内 `price_change` 频率
- 最近窗口内 `trade_print` 数量与成交量
- `liquidity_usd`
- `volume_24h_usd`

### 6.2 中间量
建议至少计算：
1. `quoted_mid = (best_bid + best_ask) / 2`
2. `depth_weighted_buy_price(size_n)`
3. `depth_weighted_sell_price(size_n)`
4. `depth_weighted_mid = (buy_exec_price_n + sell_exec_price_n) / 2`
5. `depth_imbalance = (bid_depth_top_n - ask_depth_top_n) / (bid_depth_top_n + ask_depth_top_n)`
6. `quote_trade_divergence = abs(quoted_mid - last_trade_price)`
7. `quote_churn_ratio = quote_update_count / max(trade_count, 1)`

### 6.3 displayed_probability
这是贴近平台展示或即时盘口的概率，不是最可信概率。

建议规则：
1. 若 `best_bid` 和 `best_ask` 同时存在且 spread 不宽，则优先用 `midpoint`。
2. 若 spread 很宽，则可退回 `last_trade_price`。
3. 若缺少足够盘口，则可暂退回最近 `PricePoint`。

这里和 Polymarket 用户端显示逻辑保持尽量一致。

### 6.4 robust_probability
这是给 Agent 的“稳健市场信号”，不等于 UI 显示价格。

建议规则：
1. 以 `depth_weighted_mid` 为主。
2. 用 `displayed_probability` 作为补充，而不是唯一输入。
3. 当下列情况出现时，降低对 `displayed_probability` 的信任：
   - spread 过宽
   - top-N depth 很浅
   - `quote_trade_divergence` 很大
   - 最近报价更新很多，但成交确认很少
   - 盘口单边极端失衡
4. 简化公式可以是：

```text
robust_probability =
  reliability_score * displayed_probability
  + (1 - reliability_score) * depth_weighted_mid
```

其中 `reliability_score` 越低，说明越不应该相信表层显示价格。

## 7. 风险评分建议
### 7.1 book_reliability_score
范围 `[0,1]`，越高越可信。

建议受以下因素影响：
- spread 是否过宽
- top-N depth 是否足够
- 最近成交是否确认当前价格
- tick size 是否过粗导致价格颗粒度太大
- quote churn 是否异常

### 7.2 manipulation_risk_score
范围 `[0,1]`，越高表示越可能存在浅盘口扭曲或对抗性行为。

注意：
1. 这是启发式风险，不是法务意义上的操纵认定。
2. 推荐输出 `explanatory_tags`，例如：
   - `wide_spread`
   - `shallow_book`
   - `quote_not_trade_confirmed`
   - `extreme_depth_imbalance`
   - `spoof_like_churn`

## 8. 对 Agent 的实际意义
这个设计的重点不是让 Agent “更会看盘口”，而是让它更少犯下面这类错：
1. 把一个小额挂单顶出来的价格当成现实世界大新闻。
2. 把一个很久没成交的盘口当成真实市场共识。
3. 把宽 spread 市场里的 midpoint 当成高质量概率。
4. 在没有 trade confirmation 的情况下过度更新 thesis。

更合理的下游逻辑应该是：
1. 先用 `Event/Market/Outcome/NewsSignal` 理解世界命题。
2. 再用 `OrderBookSnapshot/TradePrint` 理解这个价格是怎么形成的。
3. 最后用 `MarketMicrostructureState` 决定“市场价格应该占多大权重”。

## 9. 本次仓库改动
本次设计已经落实为：
1. PRD 更新到 v0.4。
2. `core-entity-dictionary` 新增微观结构与派生分析实体。
3. `polymarket-ontology.schema.json` 新增：
   - `order_book_snapshots`
   - `trade_prints`
   - `market_microstructure_states`
4. sample bundle 增加了 crypto / finance 的盘口、成交与稳健信号示例。
5. mapping spec 改为多源映射：Gamma + CLOB + Derived analytics。

## 10. 下一步建议
1. 实现真实 CLOB WebSocket / REST 的 ingestion adapter。
2. 用真实历史薄盘口样本验证 `robust_probability` 是否比显示概率更稳定。
3. 建立一组“被浅盘口误导”的 benchmark 题，专门测 Agent 的鲁棒性。

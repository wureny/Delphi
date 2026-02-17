# Fund Execution Entity Dictionary (v0.1)

This dictionary extends market ontology into investable and executable fund actions.

## PortfolioAccount
- `id` (string): account id for a strategy sleeve.
- `name` (string): human-readable account name.
- `base_currency` (string): settlement currency (for example USD).
- `status` (string): active, paused, archived.
- `risk_policy_id` (string): linked risk policy.

## Position
- `id` (string): unique position id.
- `portfolio_id` (string): owning portfolio account id.
- `market_id` (string): linked market id from market ontology.
- `outcome_id` (string): linked outcome id from market ontology.
- `side` (string): long or short.
- `size` (number): position quantity.
- `avg_entry_price` (number): weighted average entry price.
- `mark_price` (number): latest mark price.
- `unrealized_pnl` (number): unrealized pnl.
- `status` (string): open or closed.

## Order
- `id` (string): unique order id.
- `portfolio_id` (string): owning portfolio account id.
- `market_id` (string): linked market id.
- `outcome_id` (string): linked outcome id.
- `side` (string): buy or sell.
- `order_type` (string): market or limit.
- `quantity` (number): requested quantity.
- `limit_price` (number|null): price cap/floor for limit orders.
- `status` (string): proposed, approved, submitted, filled, canceled, rejected.
- `decision_record_id` (string): rationale trace id.

## Execution
- `id` (string): execution fill id.
- `order_id` (string): parent order id.
- `timestamp` (string, UTC date-time): fill time.
- `filled_quantity` (number): executed quantity.
- `filled_price` (number): executed price.
- `tx_hash` (string): chain tx hash.
- `fee_usd` (number): execution fee.

## Wallet
- `id` (string): wallet id.
- `address` (string): wallet address.
- `chain` (string): target chain.
- `custody_type` (string): hot, warm, cold, or simulation.
- `status` (string): enabled or disabled.
- `policy_id` (string): policy for signing/execution constraints.

## RiskPolicy
- `id` (string): policy id.
- `name` (string): policy name.
- `max_position_usd` (number): cap per position.
- `max_daily_notional_usd` (number): daily order notional cap.
- `max_market_exposure_pct` (number): concentration cap [0,1].
- `stop_loss_pct` (number): stop loss threshold [0,1].
- `requires_human_approval` (boolean): if true, execution needs manual approval.

## DecisionRecord
- `id` (string): decision id.
- `market_id` (string): linked market id.
- `outcome_id` (string): linked outcome id.
- `thesis` (string): investment thesis.
- `confidence` (number): confidence score [0,1].
- `evidence_refs` (string[]): references to ontology evidence nodes.
- `proposed_action` (string): hold, buy, sell, reduce, exit.
- `created_at` (string, UTC date-time): creation time.
- `created_by_agent` (string): proposing agent id.

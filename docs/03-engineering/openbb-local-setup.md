# OpenBB Local Setup

这份文档说明 Delphi v0 推荐的 OpenBB 接入方式：

- 本地或自托管 OpenBB REST API
- 默认不开 Basic Auth
- provider key 只配置在 OpenBB 侧
- Delphi 只通过 `OPENBB_BASE_URL` 访问统一接缝

## Why This Path

- thread3 只需要一个稳定、统一的数据接缝，不应该直接对接多个 provider SDK
- thread4 只消费 normalized snapshot，不应该知道 provider 差异
- thread2 只需要 evidence-ready candidate，不应该接触 provider 原始 payload

## Recommended Provider Set

最小 provider 组合：

- `openbb-yfinance`
  - 用于 `company profile`、`news`、`quote`、`historical`
- `openbb-sec`
  - 用于 `filings`
- `openbb-federal-reserve`
  - 用于 `effr`、`treasury_rates`

## Install OpenBB

官方文档说明：

- 启动 REST API：
  - `uvicorn openbb_core.api.rest_api:app`
- REST API 默认不需要授权
- 如需公开部署再额外开启 Basic Auth

参考：

- [REST API Quick Start](https://docs.openbb.co/python/quickstart/rest_api)
- [Data Extensions](https://docs.openbb.co/platform/usage/extensions/data_extensions)
- [User Settings & Environment Variables](https://docs.openbb.co/platform/settings_and_environment_variables)

推荐安装方式：

```bash
python -m venv .venv-openbb
source .venv-openbb/bin/activate
pip install openbb openbb-yfinance openbb-sec openbb-federal-reserve
```

如果你已经有单独的 OpenBB 环境，只需要确认这些 extensions 已安装。

## Configure OpenBB

OpenBB 官方说明，REST API 使用本地 `~/.openbb_platform/user_settings.json` 读取 credentials / defaults。

对当前 Delphi v0 推荐：

- `yfinance`
  - 不需要额外 API key
- `sec`
  - 一般不需要单独 key
- `federal_reserve`
  - 不需要单独 key

因此最小可用路径通常不需要配置任何 provider key。

如果你以后切换到 `fmp`、`polygon` 等 provider，再把对应 key 配进 OpenBB 自己的 `user_settings.json`。

## Start OpenBB API

本地开发：

```bash
source .venv-openbb/bin/activate
uvicorn openbb_core.api.rest_api:app --host 127.0.0.1 --port 8000
```

启动后可访问：

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`

如果需要局域网可访问：

```bash
uvicorn openbb_core.api.rest_api:app --host 0.0.0.0 --port 8000
```

默认不要开启 Basic Auth。
只有当你要对外暴露服务时，再考虑：

- `OPENBB_API_AUTH=True`
- `OPENBB_API_USERNAME=...`
- `OPENBB_API_PASSWORD=...`

## Delphi Environment

Delphi 这边最小只需要：

```bash
export OPENBB_BASE_URL=http://127.0.0.1:8000
```

如果你的 OpenBB API 真的开启了 Basic Auth，再额外设置：

```bash
export OPENBB_USERNAME=your_username
export OPENBB_PASSWORD=your_password
```

如果你前面挂了自己的 Bearer 认证层，也可以设置：

```bash
export OPENBB_AUTH_TOKEN=your_token
```

## Verify OpenBB Path

先验证 thread3 的真实 adapter：

```bash
OPENBB_BASE_URL=http://127.0.0.1:8000 npm run openbb:smoke
```

可选指定 ticker：

```bash
OPENBB_BASE_URL=http://127.0.0.1:8000 OPENBB_SMOKE_TICKER=MSFT npm run openbb:smoke
```

再验证 thread4 demo 走真实 adapter：

```bash
OPENBB_BASE_URL=http://127.0.0.1:8000 npm run runtime:demo:openbb
```

## What Delphi Expects

thread3 当前真实 adapter 默认请求这些 REST endpoints：

- `/api/v1/equity/profile`
- `/api/v1/news/company`
- `/api/v1/equity/price/quote`
- `/api/v1/equity/price/historical`
- `/api/v1/equity/fundamental/filings`
- `/api/v1/fixedincome/rate/effr`
- `/api/v1/fixedincome/government/treasury_rates`

provider 默认值：

- `companyProfile`: `yfinance`
- `companyNews`: `yfinance`
- `companyFilings`: `sec`
- `marketQuote`: `yfinance`
- `marketHistorical`: `yfinance`
- `macroEffr`: `federal_reserve`
- `macroTreasuryRates`: `federal_reserve`

如需覆盖，可在 Delphi 环境里设置：

- `OPENBB_PROVIDER_COMPANY_PROFILE`
- `OPENBB_PROVIDER_COMPANY_NEWS`
- `OPENBB_PROVIDER_COMPANY_FILINGS`
- `OPENBB_PROVIDER_MARKET_QUOTE`
- `OPENBB_PROVIDER_MARKET_HISTORICAL`
- `OPENBB_PROVIDER_MACRO_EFFR`
- `OPENBB_PROVIDER_MACRO_TREASURY`

## Current Limitations

- raw snapshot 还没有落 Supabase
- endpoint 成功与否依赖你本地 OpenBB 环境里对应 extension 是否已安装
- live OpenBB 路径仍需要你本地服务稳定可访问；仓库内 fixture demo 现在已经能演练 `Evidence` bridge

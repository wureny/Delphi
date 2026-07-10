# Delphi Server Runtime

The React application and Delphi runtime run as separate processes. The browser uses the product-shaped HTTP API and does not construct repositories or financial-data providers.

## Local Development

Start the Node server:

```sh
npm run server:dev
```

In another terminal, start Vite:

```sh
npm run dev
```

Vite proxies `/api` and `/healthz` to `http://127.0.0.1:8787`.

## Production Build

```sh
npm run build
npm run server:start
```

The client is written to `dist/`. The bundled Node entrypoint is written to `dist-server/startServer.js`.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Server bind host |
| `PORT` | `8787` | Server port |
| `DELPHI_CORS_ORIGINS` | local Vite origins | Comma-separated browser origin allowlist |
| `DELPHI_BODY_LIMIT_BYTES` | `1048576` | Maximum JSON request body |
| `DELPHI_REQUEST_TIMEOUT_MS` | `15000` | Node request timeout |
| `DELPHI_REPOSITORY_MODE` | `fixture` | Server repository adapter |
| `DELPHI_FINANCIAL_DATA_PROVIDER_MODE` | `mock` | Financial-data adapter |
| `VITE_DELPHI_API_BASE_URL` | same origin | Browser API base URL at client build time |

Only `fixture` and `mock` backend modes are currently supported. Unsupported values fail startup rather than falling back.

## Health Check

```sh
curl http://127.0.0.1:8787/healthz
```

The response is intentionally minimal:

```json
{"status":"ok"}
```

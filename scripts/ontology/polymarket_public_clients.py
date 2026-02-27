#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class HttpConfig:
    timeout_seconds: float = 20.0
    user_agent: str = "DelphiOntology/0.1"


class HttpJsonClient:
    def __init__(self, base_url: str, config: HttpConfig | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.config = config or HttpConfig()

    def get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        if params:
            encoded = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None}, doseq=True)
            url = f"{url}?{encoded}"
        request = urllib.request.Request(url, headers={"User-Agent": self.config.user_agent})
        with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
            payload = response.read().decode("utf-8")
        return json.loads(payload)

    def post_json(self, path: str, body: Any) -> Any:
        url = f"{self.base_url}{path}"
        request = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "User-Agent": self.config.user_agent,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
            payload = response.read().decode("utf-8")
        return json.loads(payload)


class GammaPublicClient(HttpJsonClient):
    def __init__(self, config: HttpConfig | None = None) -> None:
        super().__init__("https://gamma-api.polymarket.com", config=config)

    def list_events(self, **params: Any) -> list[dict[str, Any]]:
        payload = self.get_json("/events", params=params)
        if not isinstance(payload, list):
            raise ValueError("unexpected gamma events payload")
        return [item for item in payload if isinstance(item, dict)]

    def list_markets(self, **params: Any) -> list[dict[str, Any]]:
        payload = self.get_json("/markets", params=params)
        if not isinstance(payload, list):
            raise ValueError("unexpected gamma markets payload")
        return [item for item in payload if isinstance(item, dict)]


class ClobPublicClient(HttpJsonClient):
    def __init__(self, config: HttpConfig | None = None) -> None:
        super().__init__("https://clob.polymarket.com", config=config)

    def get_books(self, token_ids: list[str]) -> list[dict[str, Any]]:
        body = [{"token_id": token_id} for token_id in token_ids]
        payload = self.post_json("/books", body=body)
        if not isinstance(payload, list):
            raise ValueError("unexpected clob books payload")
        return [item for item in payload if isinstance(item, dict)]

    def get_midpoints(self, token_ids: list[str]) -> dict[str, dict[str, Any]]:
        params = [("token_id", token_id) for token_id in token_ids]
        query = urllib.parse.urlencode(params, doseq=True)
        payload = self.get_json(f"/midpoints?{query}" if query else "/midpoints")
        if not isinstance(payload, dict):
            raise ValueError("unexpected clob midpoints payload")
        return payload

    def get_last_trade_prices(self, token_ids: list[str]) -> dict[str, Any]:
        params = [("token_id", token_id) for token_id in token_ids]
        query = urllib.parse.urlencode(params, doseq=True)
        payload = self.get_json(f"/last-trade-prices?{query}" if query else "/last-trade-prices")
        if not isinstance(payload, dict):
            raise ValueError("unexpected clob last trade payload")
        return payload

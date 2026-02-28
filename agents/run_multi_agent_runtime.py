#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import copy
import importlib
import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__:
    from .build_multi_agent_context import MultiAgentContextBuilder
    from .build_decision_records import build_decision_records
    from .build_order_proposals import build_order_proposals
    from .contracts import validate_agent_context, validate_execution_bundle, validate_ontology_bundle
    from .evaluate_risk_policy_gate import evaluate_gate
    from .simulate_paper_execution import simulate_paper_execution
    from .runtime_memory import (
        build_memory_context,
        get_session_memory,
        load_runtime_memory_store,
        save_runtime_memory_store,
        update_session_memory,
    )
else:
    from build_multi_agent_context import MultiAgentContextBuilder
    from build_decision_records import build_decision_records
    from build_order_proposals import build_order_proposals
    from contracts import validate_agent_context, validate_execution_bundle, validate_ontology_bundle
    from evaluate_risk_policy_gate import evaluate_gate
    from simulate_paper_execution import simulate_paper_execution
    from runtime_memory import (
        build_memory_context,
        get_session_memory,
        load_runtime_memory_store,
        save_runtime_memory_store,
        update_session_memory,
    )


DEFAULT_PORTFOLIO_ID = "pf_main"
DEFAULT_ORDER_TYPE = "limit"
DEFAULT_RUNTIME_ENGINE = "heuristic"
DEFAULT_LLM_BASE_URL = "https://api.openai.com/v1"
DEFAULT_LLM_MODEL = "gpt-4o-mini"
DEFAULT_LLM_API_KEY_ENV = "OPENAI_API_KEY"
DEFAULT_ADK_PROVIDER = "openai"
DEFAULT_ADK_MODEL = "gemini-2.5-flash"
DEFAULT_ADK_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_ADK_OPENAI_API_KEY_ENV = "OPENAI_API_KEY"
DEFAULT_ADK_OPENAI_BASE_URL_ENV = "OPENAI_API_BASE"
DEFAULT_ADK_APP_NAME = "delphi_adk_runtime"
DEFAULT_ADK_USER_ID = "delphi_runtime_user"
DEFAULT_ADK_SESSION_PREFIX = "delphi_adk_session"
DEFAULT_SIMULATION_FILL_RATIO = 1.0
DEFAULT_SIMULATION_FEE_BPS = 10.0
DEFAULT_SIMULATION_SLIPPAGE_BPS = 5.0
DEFAULT_SIMULATION_PREFIX = "sim"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a minimal multi-agent runtime skeleton over agent context/ontology bundle and "
            "bridge into DecisionRecord -> RiskPolicy gate -> Order proposal."
        )
    )
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--agent-context", help="Path to the multi-agent context JSON.")
    source_group.add_argument(
        "--ontology-bundle",
        help="Path to polymarket ontology bundle JSON. Runtime will derive multi-agent context automatically.",
    )
    parser.add_argument("--execution-bundle", required=True, help="Path to fund execution bundle JSON.")
    parser.add_argument("--output", required=True, help="Path to write runtime output JSON.")
    parser.add_argument(
        "--skip-contract-validation",
        action="store_true",
        help="Skip source/agent-context and execution-bundle contract validation.",
    )
    parser.add_argument(
        "--runtime-memory-path",
        help="Optional JSON file path used to persist and reuse per-session runtime memory.",
    )
    parser.add_argument(
        "--runtime-memory-max-decisions",
        type=int,
        default=20,
        help="Max candidate decisions retained per session in runtime memory.",
    )
    parser.add_argument(
        "--runtime-memory-max-summaries",
        type=int,
        default=20,
        help="Max research summaries retained per session in runtime memory.",
    )
    parser.add_argument(
        "--runtime-engine",
        choices=["heuristic", "adk", "llm"],
        default=DEFAULT_RUNTIME_ENGINE,
        help="Runtime orchestrator backend. adk uses ADK Runner+SessionService; llm uses OpenAI-compatible chat completions.",
    )
    parser.add_argument("--session-id", default="local_session", help="Runtime session id.")
    parser.add_argument("--portfolio-id", default=DEFAULT_PORTFOLIO_ID, help="Portfolio id for risk/order evaluation.")
    parser.add_argument("--policy-id", default=None, help="Optional risk policy id override.")
    parser.add_argument("--default-order-size-usd", type=float, default=500.0, help="Default notional per proposed action.")
    parser.add_argument("--include-hold", action="store_true", help="Keep hold decisions through DecisionRecord/RiskGate.")
    parser.add_argument("--order-type", choices=["market", "limit"], default=DEFAULT_ORDER_TYPE, help="Order type for proposals.")
    parser.add_argument("--llm-base-url", default=DEFAULT_LLM_BASE_URL, help="OpenAI-compatible API base URL.")
    parser.add_argument("--llm-model", default=DEFAULT_LLM_MODEL, help="LLM model id used in runtime-engine=llm.")
    parser.add_argument("--llm-api-key-env", default=DEFAULT_LLM_API_KEY_ENV, help="Environment variable name containing API key.")
    parser.add_argument("--llm-timeout-seconds", type=float, default=30.0, help="HTTP timeout in seconds for LLM calls.")
    parser.add_argument("--llm-max-tokens", type=int, default=300, help="Max completion tokens for each agent call.")
    parser.add_argument("--llm-temperature", type=float, default=0.1, help="Sampling temperature for LLM calls.")
    parser.add_argument(
        "--llm-mock-responses",
        help=(
            "Optional JSON file with per-agent mock responses for offline testing. "
            "When set, runtime-engine=llm can run without network/API key."
        ),
    )
    parser.add_argument("--adk-model", default=DEFAULT_ADK_MODEL, help="ADK model id used in runtime-engine=adk.")
    parser.add_argument("--adk-app-name", default=DEFAULT_ADK_APP_NAME, help="ADK app_name used by SessionService.")
    parser.add_argument("--adk-user-id", default=DEFAULT_ADK_USER_ID, help="ADK user_id used by SessionService.")
    parser.add_argument(
        "--adk-session-prefix",
        default=DEFAULT_ADK_SESSION_PREFIX,
        help="Prefix used to create per-agent ADK session ids.",
    )
    parser.add_argument(
        "--adk-mock-responses",
        help=(
            "Optional JSON file with per-agent mock responses for runtime-engine=adk. "
            "Useful for offline validation while still using ADK session/context wiring."
        ),
    )
    parser.add_argument(
        "--adk-provider",
        choices=["openai", "gemini"],
        default=DEFAULT_ADK_PROVIDER,
        help="ADK model provider. openai uses OpenAI-compatible endpoint via LiteLlm when available.",
    )
    parser.add_argument(
        "--adk-openai-model",
        default=DEFAULT_ADK_OPENAI_MODEL,
        help="OpenAI model id used when --adk-provider=openai.",
    )
    parser.add_argument(
        "--adk-openai-api-key-env",
        default=DEFAULT_ADK_OPENAI_API_KEY_ENV,
        help="Environment variable name containing OpenAI-compatible API key for ADK.",
    )
    parser.add_argument(
        "--adk-openai-base-url-env",
        default=DEFAULT_ADK_OPENAI_BASE_URL_ENV,
        help="Environment variable name for OpenAI-compatible API base URL (must include /v1).",
    )
    parser.add_argument(
        "--adk-openai-base-url",
        help="Optional OpenAI-compatible API base URL to export into --adk-openai-base-url-env at runtime.",
    )
    parser.add_argument(
        "--adk-session-db-url",
        help=(
            "Optional SQLAlchemy DB URL for persistent ADK sessions "
            "(for example sqlite+aiosqlite:///tmp/delphi_adk_sessions.db)."
        ),
    )
    parser.add_argument("--enable-paper-trading", action="store_true", help="Run paper-trading simulation after order proposals.")
    parser.add_argument(
        "--execute-proposed-orders",
        action="store_true",
        help="In paper-trading mode, execute orders with status=proposed.",
    )
    parser.add_argument(
        "--simulation-fill-ratio",
        type=float,
        default=DEFAULT_SIMULATION_FILL_RATIO,
        help="Paper-trading fill ratio in [0,1].",
    )
    parser.add_argument(
        "--simulation-fee-bps",
        type=float,
        default=DEFAULT_SIMULATION_FEE_BPS,
        help="Paper-trading fee in basis points.",
    )
    parser.add_argument(
        "--simulation-slippage-bps",
        type=float,
        default=DEFAULT_SIMULATION_SLIPPAGE_BPS,
        help="Paper-trading slippage in basis points.",
    )
    parser.add_argument(
        "--simulation-prefix",
        default=DEFAULT_SIMULATION_PREFIX,
        help="Prefix used to build simulation ids and tx references.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print output JSON.")
    return parser.parse_args()


@dataclass(frozen=True)
class LLMRuntimeConfig:
    base_url: str
    model: str
    api_key_env: str
    timeout_seconds: float
    max_tokens: int
    temperature: float
    mock_responses_path: str | None


@dataclass(frozen=True)
class ADKRuntimeConfig:
    provider: str
    model: str
    openai_model: str
    openai_api_key_env: str
    openai_base_url_env: str
    openai_base_url: str | None
    app_name: str
    user_id: str
    session_prefix: str
    session_db_url: str | None
    runtime_session_id: str
    mock_responses_path: str | None


@dataclass(frozen=True)
class RuntimeMemoryConfig:
    path: str
    max_decisions: int
    max_summaries: int


class OpenAICompatClient:
    def __init__(self, config: LLMRuntimeConfig) -> None:
        self.config = config

    def chat_completion_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        api_key = os.environ.get(self.config.api_key_env)
        if not api_key:
            raise RuntimeError(f"missing API key in env: {self.config.api_key_env}")
        base = self.config.base_url.rstrip("/")
        url = f"{base}/chat/completions"
        payload = {
            "model": self.config.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "DelphiMultiAgentRuntime/0.1",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"llm http error {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"llm network error: {exc}") from exc

        decoded = json.loads(raw)
        choices = decoded.get("choices") or []
        if not choices:
            raise RuntimeError("llm response missing choices")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if isinstance(content, list):
            content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("llm response missing message content")
        return parse_embedded_json(content)


def parse_embedded_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end < start:
            raise RuntimeError("llm response is not valid JSON")
        obj = json.loads(text[start : end + 1])
    if not isinstance(obj, dict):
        raise RuntimeError("llm JSON response must be an object")
    return obj


class LLMRuntime:
    def __init__(self, config: LLMRuntimeConfig) -> None:
        self.config = config
        self.client = OpenAICompatClient(config)
        self.mock_responses = self._load_mock_responses(config.mock_responses_path)
        self.mock_indexes: dict[str, int] = {}
        self.call_count = 0
        self.failure_count = 0
        self.mock_count = 0

    def _load_mock_responses(self, path: str | None) -> dict[str, list[dict[str, Any]]]:
        if path is None:
            return {}
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise SystemExit("--llm-mock-responses must be a JSON object keyed by agent name")
        responses: dict[str, list[dict[str, Any]]] = {}
        for agent, items in payload.items():
            if not isinstance(agent, str) or not isinstance(items, list):
                continue
            responses[agent] = [item for item in items if isinstance(item, dict)]
        return responses

    def _next_mock_response(self, agent: str) -> dict[str, Any] | None:
        queue = self.mock_responses.get(agent) or []
        if not queue:
            return None
        index = self.mock_indexes.get(agent, 0)
        if index >= len(queue):
            index = len(queue) - 1
        self.mock_indexes[agent] = index + 1
        self.mock_count += 1
        return queue[index]

    def _run_json_agent(self, agent: str, system_prompt: str, user_prompt: str, fallback: dict[str, Any]) -> dict[str, Any]:
        mock = self._next_mock_response(agent)
        if mock is not None:
            result = dict(mock)
            result["_response_mode"] = "mock"
            return result
        self.call_count += 1
        try:
            result = self.client.chat_completion_json(system_prompt=system_prompt, user_prompt=user_prompt)
            result["_response_mode"] = "live"
            return result
        except Exception as exc:
            self.failure_count += 1
            degraded = dict(fallback)
            degraded["_response_mode"] = "fallback_on_error"
            degraded["_error"] = str(exc)
            return degraded

    def research_summary(self, packet: dict[str, Any]) -> dict[str, Any]:
        fallback = {
            "summary": (
                f"category={packet.get('category')}, trading_state={packet.get('trading_state')}, "
                f"news_count={len(packet.get('related_news_signals', []))}, outcomes={len(packet.get('outcomes', []))}"
            )
        }
        return self._run_json_agent(
            agent="research_agent",
            system_prompt=(
                "You are ResearchAgent. Summarize market facts without trading advice. "
                "Return strict JSON: {\"summary\": string}."
            ),
            user_prompt=json.dumps(packet, ensure_ascii=True),
            fallback=fallback,
        )

    def strategy_decision(self, strategy_packet: dict[str, Any], default_thesis: str) -> dict[str, Any]:
        fallback = {
            "strategy_recommendation": strategy_packet.get("strategy_recommendation", "hold"),
            "thesis_summary": default_thesis,
            "confidence": 0.5,
        }
        return self._run_json_agent(
            agent="strategy_agent",
            system_prompt=(
                "You are StrategyAgent. Output strict JSON with keys: "
                "strategy_recommendation (consider_buy|consider_sell|hold|monitor), "
                "thesis_summary (short string), confidence (0..1)."
            ),
            user_prompt=json.dumps(strategy_packet, ensure_ascii=True),
            fallback=fallback,
        )

    def risk_decision(self, strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> dict[str, Any]:
        fallback = {
            "risk_gate": risk_packet.get("risk_gate", "caution"),
            "risk_reasons": list(risk_packet.get("risk_reasons") or ["fallback_risk_packet"]),
        }
        return self._run_json_agent(
            agent="risk_agent",
            system_prompt=(
                "You are RiskAgent. Output strict JSON with keys: "
                "risk_gate (allow|caution|block), risk_reasons (array of short snake_case strings)."
            ),
            user_prompt=json.dumps(
                {
                    "strategy_packet": strategy_packet,
                    "risk_packet": risk_packet,
                },
                ensure_ascii=True,
            ),
            fallback=fallback,
        )

    def audit_summary(self, audit_packet: dict[str, Any], fallback_summary: str) -> dict[str, Any]:
        fallback = {"trace_summary": fallback_summary}
        return self._run_json_agent(
            agent="audit_agent",
            system_prompt=(
                "You are AuditAgent. Output strict JSON: "
                "{\"trace_summary\": string}. Mention source and why current signal should be trusted cautiously."
            ),
            user_prompt=json.dumps(audit_packet, ensure_ascii=True),
            fallback=fallback,
        )

    def stats(self) -> dict[str, Any]:
        return {
            "llm_call_count": self.call_count,
            "llm_failure_count": self.failure_count,
            "llm_mock_count": self.mock_count,
            "llm_model": self.config.model,
            "llm_base_url": self.config.base_url,
            "llm_api_key_env": self.config.api_key_env,
            "llm_mock_responses_path": self.config.mock_responses_path,
        }


class ADKRuntime:
    def __init__(self, config: ADKRuntimeConfig) -> None:
        self.config = config
        self.mock_responses = self._load_mock_responses(config.mock_responses_path)
        self.mock_indexes: dict[str, int] = {}
        self.call_count = 0
        self.failure_count = 0
        self.mock_count = 0
        self._session_cache: dict[str, Any] = {}
        self._bootstrap()

    def _bootstrap(self) -> None:
        try:
            runners_mod = importlib.import_module("google.adk.runners")
            agents_mod = importlib.import_module("google.adk.agents")
            sessions_mod = importlib.import_module("google.adk.sessions")
            genai_types_mod = importlib.import_module("google.genai.types")
        except ModuleNotFoundError as exc:
            raise SystemExit(
                "runtime-engine=adk requested but required ADK modules are not installed. "
                "Install google-adk and google-genai first."
            ) from exc
        runner_cls = getattr(runners_mod, "Runner", None)
        in_memory_runner_cls = getattr(runners_mod, "InMemoryRunner", None)
        if runner_cls is None and in_memory_runner_cls is None:
            raise SystemExit("ADK runtime missing Runner/InMemoryRunner classes")
        agent_cls = getattr(agents_mod, "Agent", None) or getattr(agents_mod, "LlmAgent", None)
        if agent_cls is None:
            raise SystemExit("ADK runtime missing Agent/LlmAgent class")
        in_memory_session_service_cls = getattr(sessions_mod, "InMemorySessionService", None)
        if in_memory_session_service_cls is None:
            raise SystemExit("ADK runtime missing InMemorySessionService")

        self._runner_cls = runner_cls
        self._in_memory_runner_cls = in_memory_runner_cls
        self._agent_cls = agent_cls
        self._session_service = self._build_session_service(
            in_memory_session_service_cls=in_memory_session_service_cls,
        )
        self._content_cls = getattr(genai_types_mod, "Content", None)
        self._part_cls = getattr(genai_types_mod, "Part", None)
        if self._content_cls is None or self._part_cls is None:
            raise SystemExit("ADK runtime missing google.genai.types.Content/Part")
        self._runners: dict[str, Any] = {}

    def _build_session_service(self, in_memory_session_service_cls: type[Any]) -> Any:
        if not self.config.session_db_url:
            self._session_service_kind = "in_memory"
            return in_memory_session_service_cls()
        try:
            db_sessions_mod = importlib.import_module("google.adk.sessions.database_session_service")
        except ModuleNotFoundError as exc:
            raise SystemExit(
                "--adk-session-db-url requires google.adk.sessions.database_session_service. "
                "Install ADK database extras first."
            ) from exc
        db_service_cls = getattr(db_sessions_mod, "DatabaseSessionService", None)
        if db_service_cls is None:
            raise SystemExit("ADK runtime missing DatabaseSessionService")
        self._session_service_kind = "database"
        return db_service_cls(self.config.session_db_url)

    def _load_mock_responses(self, path: str | None) -> dict[str, list[dict[str, Any]]]:
        if path is None:
            return {}
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise SystemExit("--adk-mock-responses must be a JSON object keyed by agent name")
        responses: dict[str, list[dict[str, Any]]] = {}
        for agent, items in payload.items():
            if not isinstance(agent, str) or not isinstance(items, list):
                continue
            responses[agent] = [item for item in items if isinstance(item, dict)]
        return responses

    def _next_mock_response(self, agent: str) -> dict[str, Any] | None:
        queue = self.mock_responses.get(agent) or []
        if not queue:
            return None
        index = self.mock_indexes.get(agent, 0)
        if index >= len(queue):
            index = len(queue) - 1
        self.mock_indexes[agent] = index + 1
        self.mock_count += 1
        return queue[index]

    async def _ensure_session(self, agent: str, runner: Any) -> Any:
        cached = self._session_cache.get(agent)
        if cached is not None:
            return cached
        session_id = f"{self.config.session_prefix}_{sanitize_session_id(self.config.runtime_session_id)}_{agent}"
        create_fn = getattr(self._session_service, "create_session", None)
        get_fn = getattr(self._session_service, "get_session", None)
        if create_fn is None:
            raise RuntimeError("ADK SessionService missing create_session")
        try:
            session = await create_fn(
                app_name=self.config.app_name,
                user_id=self.config.user_id,
                session_id=session_id,
            )
        except Exception:
            if get_fn is None:
                raise
            session = await get_fn(
                app_name=self.config.app_name,
                user_id=self.config.user_id,
                session_id=session_id,
            )
            if session is None:
                raise
        self._session_cache[agent] = session
        return session

    def _build_runner(self, agent: str, system_prompt: str) -> Any:
        existing = self._runners.get(agent)
        if existing is not None:
            return existing
        agent_name = f"delphi_{agent}"
        model_ref = self._resolve_model_ref()
        try:
            adk_agent = self._agent_cls(
                name=agent_name,
                model=model_ref,
                instruction=system_prompt,
                description=f"Delphi ADK runtime agent: {agent}",
            )
        except TypeError:
            adk_agent = self._agent_cls(
                name=agent_name,
                model=model_ref,
                description=f"Delphi ADK runtime agent: {agent}",
                instruction=system_prompt,
            )
        if self._runner_cls is not None:
            runner = self._runner_cls(
                agent=adk_agent,
                app_name=self.config.app_name,
                session_service=self._session_service,
            )
        else:
            runner = self._in_memory_runner_cls(
                agent=adk_agent,
                app_name=self.config.app_name,
            )
        self._runners[agent] = runner
        return runner

    def _resolve_model_ref(self) -> Any:
        if self.config.provider == "gemini":
            return self.config.model
        openai_model = self.config.openai_model
        if "/" not in openai_model:
            openai_model = f"openai/{openai_model}"
        litellm_cls = load_adk_litellm_class()
        if litellm_cls is None:
            return openai_model
        return litellm_cls(model=openai_model)

    def _make_content(self, user_prompt: str) -> Any:
        if hasattr(self._part_cls, "from_text"):
            part = self._part_cls.from_text(user_prompt)
        else:
            part = self._part_cls(text=user_prompt)
        return self._content_cls(role="user", parts=[part])

    async def _run_once(self, agent: str, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        runner = self._build_runner(agent, system_prompt=system_prompt)
        session = await self._ensure_session(agent, runner)
        message = self._make_content(user_prompt)
        last_text = ""
        run_async = getattr(runner, "run_async", None)
        if run_async is None:
            raise RuntimeError("ADK runner missing run_async")
        async for event in run_async(
            user_id=self.config.user_id,
            session_id=getattr(session, "id", f"{self.config.session_prefix}_{agent}"),
            new_message=message,
        ):
            content = getattr(event, "content", None)
            if content is None:
                continue
            parts = getattr(content, "parts", None) or []
            for part in parts:
                text = getattr(part, "text", None)
                if isinstance(text, str) and text.strip():
                    last_text = text
        if not last_text.strip():
            raise RuntimeError("adk response missing message content")
        return parse_embedded_json(last_text)

    def _run_json_agent(self, agent: str, system_prompt: str, user_prompt: str, fallback: dict[str, Any]) -> dict[str, Any]:
        mock = self._next_mock_response(agent)
        if mock is not None:
            result = dict(mock)
            result["_response_mode"] = "mock"
            return result
        self.call_count += 1
        try:
            result = asyncio.run(self._run_once(agent, system_prompt=system_prompt, user_prompt=user_prompt))
            result["_response_mode"] = "live"
            return result
        except Exception as exc:
            self.failure_count += 1
            degraded = dict(fallback)
            degraded["_response_mode"] = "fallback_on_error"
            degraded["_error"] = str(exc)
            return degraded

    def research_summary(self, packet: dict[str, Any]) -> dict[str, Any]:
        fallback = {
            "summary": (
                f"category={packet.get('category')}, trading_state={packet.get('trading_state')}, "
                f"news_count={len(packet.get('related_news_signals', []))}, outcomes={len(packet.get('outcomes', []))}"
            )
        }
        return self._run_json_agent(
            agent="research_agent",
            system_prompt=(
                "You are ResearchAgent. Summarize market facts without trading advice. "
                "Return strict JSON: {\"summary\": string}."
            ),
            user_prompt=json.dumps(packet, ensure_ascii=True),
            fallback=fallback,
        )

    def strategy_decision(self, strategy_packet: dict[str, Any], default_thesis: str) -> dict[str, Any]:
        fallback = {
            "strategy_recommendation": strategy_packet.get("strategy_recommendation", "hold"),
            "thesis_summary": default_thesis,
            "confidence": 0.5,
        }
        return self._run_json_agent(
            agent="strategy_agent",
            system_prompt=(
                "You are StrategyAgent. Output strict JSON with keys: "
                "strategy_recommendation (consider_buy|consider_sell|hold|monitor), "
                "thesis_summary (short string), confidence (0..1)."
            ),
            user_prompt=json.dumps(strategy_packet, ensure_ascii=True),
            fallback=fallback,
        )

    def risk_decision(self, strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> dict[str, Any]:
        fallback = {
            "risk_gate": risk_packet.get("risk_gate", "caution"),
            "risk_reasons": list(risk_packet.get("risk_reasons") or ["fallback_risk_packet"]),
        }
        return self._run_json_agent(
            agent="risk_agent",
            system_prompt=(
                "You are RiskAgent. Output strict JSON with keys: "
                "risk_gate (allow|caution|block), risk_reasons (array of short snake_case strings)."
            ),
            user_prompt=json.dumps(
                {
                    "strategy_packet": strategy_packet,
                    "risk_packet": risk_packet,
                },
                ensure_ascii=True,
            ),
            fallback=fallback,
        )

    def audit_summary(self, audit_packet: dict[str, Any], fallback_summary: str) -> dict[str, Any]:
        fallback = {"trace_summary": fallback_summary}
        return self._run_json_agent(
            agent="audit_agent",
            system_prompt=(
                "You are AuditAgent. Output strict JSON: "
                "{\"trace_summary\": string}. Mention source and why current signal should be trusted cautiously."
            ),
            user_prompt=json.dumps(audit_packet, ensure_ascii=True),
            fallback=fallback,
        )

    def stats(self) -> dict[str, Any]:
        return {
            "adk_call_count": self.call_count,
            "adk_failure_count": self.failure_count,
            "adk_mock_count": self.mock_count,
            "adk_provider": self.config.provider,
            "adk_model": self.config.model if self.config.provider == "gemini" else self.config.openai_model,
            "adk_app_name": self.config.app_name,
            "adk_user_id": self.config.user_id,
            "adk_session_prefix": self.config.session_prefix,
            "adk_session_service": self._session_service_kind,
            "adk_session_db_url": self.config.session_db_url,
            "adk_mock_responses_path": self.config.mock_responses_path,
        }


def load_source_context(
    agent_context_path: str | None,
    ontology_bundle_path: str | None,
    validate_contracts: bool,
) -> tuple[str, dict[str, Any]]:
    if agent_context_path:
        agent_context = json.loads(Path(agent_context_path).read_text(encoding="utf-8"))
        return "agent_context", agent_context
    if not ontology_bundle_path:
        raise SystemExit("one of --agent-context / --ontology-bundle is required")
    ontology_bundle = json.loads(Path(ontology_bundle_path).read_text(encoding="utf-8"))
    if validate_contracts:
        validate_ontology_bundle(ontology_bundle)
    agent_context = MultiAgentContextBuilder().build(ontology_bundle)
    return "ontology_bundle", agent_context


def main() -> int:
    args = parse_args()
    source_context_kind, source_context = load_source_context(
        agent_context_path=args.agent_context,
        ontology_bundle_path=args.ontology_bundle,
        validate_contracts=not args.skip_contract_validation,
    )
    execution_bundle = json.loads(Path(args.execution_bundle).read_text(encoding="utf-8"))
    llm_config = LLMRuntimeConfig(
        base_url=args.llm_base_url,
        model=args.llm_model,
        api_key_env=args.llm_api_key_env,
        timeout_seconds=args.llm_timeout_seconds,
        max_tokens=args.llm_max_tokens,
        temperature=args.llm_temperature,
        mock_responses_path=args.llm_mock_responses,
    )
    adk_config = ADKRuntimeConfig(
        provider=args.adk_provider,
        model=args.adk_model,
        openai_model=args.adk_openai_model,
        openai_api_key_env=args.adk_openai_api_key_env,
        openai_base_url_env=args.adk_openai_base_url_env,
        openai_base_url=args.adk_openai_base_url,
        app_name=args.adk_app_name,
        user_id=args.adk_user_id,
        session_prefix=args.adk_session_prefix,
        session_db_url=args.adk_session_db_url,
        runtime_session_id=args.session_id,
        mock_responses_path=args.adk_mock_responses,
    )
    runtime_memory_config = None
    if args.runtime_memory_path:
        runtime_memory_config = RuntimeMemoryConfig(
            path=args.runtime_memory_path,
            max_decisions=max(1, int(args.runtime_memory_max_decisions)),
            max_summaries=max(1, int(args.runtime_memory_max_summaries)),
        )
    result = run_runtime(
        agent_context=source_context,
        source_context_kind=source_context_kind,
        execution_bundle=execution_bundle,
        runtime_engine=args.runtime_engine,
        session_id=args.session_id,
        portfolio_id=args.portfolio_id,
        policy_id=args.policy_id,
        default_order_size_usd=args.default_order_size_usd,
        include_hold=args.include_hold,
        order_type=args.order_type,
        llm_config=llm_config,
        adk_config=adk_config,
        enable_paper_trading=args.enable_paper_trading,
        execute_proposed_orders=args.execute_proposed_orders,
        simulation_fill_ratio=args.simulation_fill_ratio,
        simulation_fee_bps=args.simulation_fee_bps,
        simulation_slippage_bps=args.simulation_slippage_bps,
        simulation_prefix=args.simulation_prefix,
        validate_contracts=not args.skip_contract_validation,
        runtime_memory_config=runtime_memory_config,
    )
    indent = 2 if args.pretty else None
    Path(args.output).write_text(json.dumps(result, indent=indent) + "\n", encoding="utf-8")
    print(
        f"[multi-agent-runtime] wrote {args.output} "
        f"engine={result['runtime_engine']} "
        f"decisions={len(result['runtime_agent_context']['candidate_decisions'])} "
        f"orders={len(result['order_proposals_payload']['orders'])}"
    )
    return 0


def run_runtime(
    agent_context: dict[str, Any],
    source_context_kind: str,
    execution_bundle: dict[str, Any],
    runtime_engine: str,
    session_id: str,
    portfolio_id: str,
    policy_id: str | None,
    default_order_size_usd: float,
    include_hold: bool,
    order_type: str,
    llm_config: LLMRuntimeConfig | None = None,
    adk_config: ADKRuntimeConfig | None = None,
    enable_paper_trading: bool = False,
    execute_proposed_orders: bool = False,
    simulation_fill_ratio: float = DEFAULT_SIMULATION_FILL_RATIO,
    simulation_fee_bps: float = DEFAULT_SIMULATION_FEE_BPS,
    simulation_slippage_bps: float = DEFAULT_SIMULATION_SLIPPAGE_BPS,
    simulation_prefix: str = DEFAULT_SIMULATION_PREFIX,
    validate_contracts: bool = True,
    runtime_memory_config: RuntimeMemoryConfig | None = None,
) -> dict[str, Any]:
    if validate_contracts:
        validate_agent_context(agent_context)
        validate_execution_bundle(execution_bundle)
    session_memory: dict[str, Any] = {}
    memory_store: dict[str, Any] | None = None
    session_memory_info = {
        "enabled": False,
        "path": None,
        "source_run_count": 0,
        "updated_run_count": 0,
        "decision_memory_size": 0,
        "summary_memory_size": 0,
        "risk_reason_memory_size": 0,
    }
    if runtime_memory_config is not None:
        memory_store = load_runtime_memory_store(runtime_memory_config.path)
        session_memory = get_session_memory(memory_store, session_id)
        session_memory_info.update(
            {
                "enabled": True,
                "path": runtime_memory_config.path,
                "source_run_count": int(session_memory.get("run_count", 0))
                if isinstance(session_memory, dict)
                else 0,
            }
        )
    runtime_client = ensure_runtime_engine(
        runtime_engine,
        llm_config=llm_config,
        adk_config=adk_config,
    )
    runtime_context, trace = build_runtime_agent_context(
        source_context=agent_context,
        runtime_engine=runtime_engine,
        session_id=session_id,
        runtime_client=runtime_client,
        session_memory=session_memory,
    )
    decision_records_payload = build_decision_records(runtime_context, include_hold=include_hold)
    risk_gate_payload = evaluate_gate(
        agent_context=runtime_context,
        execution_bundle=execution_bundle,
        portfolio_id=portfolio_id,
        policy_id=policy_id,
        default_order_size_usd=default_order_size_usd,
        include_hold=include_hold,
    )
    order_proposals_payload = build_order_proposals(
        decision_payload=decision_records_payload,
        gate_payload=risk_gate_payload,
        execution_bundle=execution_bundle,
        portfolio_id=portfolio_id,
        order_type=order_type,
    )
    paper_trading_payload = None
    if enable_paper_trading:
        paper_trading_payload = simulate_paper_execution(
            order_payload=order_proposals_payload,
            decision_payload=decision_records_payload,
            execution_bundle=execution_bundle,
            portfolio_id=portfolio_id,
            execute_proposed_orders=execute_proposed_orders,
            fill_ratio=simulation_fill_ratio,
            fee_bps=simulation_fee_bps,
            slippage_bps=simulation_slippage_bps,
            simulation_prefix=simulation_prefix,
        )
    if runtime_memory_config is not None and memory_store is not None:
        updated_info = update_session_memory(
            store=memory_store,
            session_id=session_id,
            runtime_engine=runtime_engine,
            runtime_context=runtime_context,
            max_decisions=runtime_memory_config.max_decisions,
            max_summaries=runtime_memory_config.max_summaries,
        )
        updated_info["path"] = runtime_memory_config.path
        session_memory_info.update(updated_info)
        save_runtime_memory_store(runtime_memory_config.path, memory_store)
    runtime_context.setdefault("runtime_metadata", {})
    runtime_context["runtime_metadata"]["session_memory"] = session_memory_info
    return {
        "schema_version": "v0.1",
        "generated_at": utc_iso8601(),
        "runtime_engine": runtime_engine,
        "session_id": session_id,
        "source_context_kind": source_context_kind,
        "source_agent_context_generated_at": agent_context.get("generated_at"),
        "source_bundle_generated_at": agent_context.get("source_bundle_generated_at"),
        "session_memory": session_memory_info,
        "orchestration_trace": trace,
        "runtime_agent_context": runtime_context,
        "decision_records_payload": decision_records_payload,
        "risk_gate_payload": risk_gate_payload,
        "order_proposals_payload": order_proposals_payload,
        "paper_trading_payload": paper_trading_payload,
    }


def ensure_runtime_engine(
    runtime_engine: str,
    llm_config: LLMRuntimeConfig | None,
    adk_config: ADKRuntimeConfig | None,
) -> LLMRuntime | ADKRuntime | None:
    if runtime_engine == "heuristic":
        return None
    if runtime_engine == "llm":
        if llm_config is None:
            raise SystemExit("llm runtime requires llm_config")
        api_key = os.environ.get(llm_config.api_key_env)
        if not llm_config.mock_responses_path and not api_key:
            raise SystemExit(
                f"runtime-engine=llm requires API key env {llm_config.api_key_env} "
                "or --llm-mock-responses for offline testing."
            )
        return LLMRuntime(llm_config)
    if adk_config is None:
        raise SystemExit("adk runtime requires adk_config")
    if adk_config.provider == "openai":
        if adk_config.openai_base_url:
            os.environ[adk_config.openai_base_url_env] = adk_config.openai_base_url
        api_key = os.environ.get(adk_config.openai_api_key_env)
        if not adk_config.mock_responses_path and not api_key:
            raise SystemExit(
                f"runtime-engine=adk with provider=openai requires API key env {adk_config.openai_api_key_env} "
                "or --adk-mock-responses for offline testing."
            )
    else:
        gemini_api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not adk_config.mock_responses_path and not gemini_api_key:
            raise SystemExit(
                "runtime-engine=adk with provider=gemini requires GOOGLE_API_KEY or GEMINI_API_KEY "
                "or --adk-mock-responses for offline testing."
            )
    try:
        importlib.import_module("google.adk")
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "runtime-engine=adk requested but google-adk is not installed. "
            "Install ADK dependencies first, or run with --runtime-engine heuristic."
        ) from exc
    return ADKRuntime(adk_config)


def build_runtime_agent_context(
    source_context: dict[str, Any],
    runtime_engine: str,
    session_id: str,
    runtime_client: LLMRuntime | ADKRuntime | None,
    session_memory: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    strategy_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in source_context.get("strategy_agent_packets", [])
    }
    risk_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in source_context.get("risk_agent_packets", [])
    }
    audit_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in source_context.get("audit_agent_packets", [])
    }
    base_candidate_by_key = {
        (item["market_id"], item["outcome_id"]): item
        for item in source_context.get("candidate_decisions", [])
    }

    research_outputs = []
    for packet in source_context.get("research_agent_packets", []):
        runtime_packet = attach_runtime_memory_context(
            packet=packet,
            session_memory=session_memory,
            market_id=str(packet.get("market_id") or ""),
            outcome_id=None,
        )
        summary = (
            f"category={packet.get('category')}, trading_state={packet.get('trading_state')}, "
            f"news_count={len(packet.get('related_news_signals', []))}, outcomes={len(packet.get('outcomes', []))}"
        )
        response_mode = "heuristic"
        if runtime_client is not None:
            runtime_output = runtime_client.research_summary(runtime_packet)
            summary = str(runtime_output.get("summary") or summary)
            response_mode = str(runtime_output.get("_response_mode", runtime_engine))
        research_outputs.append(
            {
                "agent": "research_agent",
                "event_id": packet["event_id"],
                "market_id": packet["market_id"],
                "summary": summary,
                "response_mode": response_mode,
            }
        )

    strategy_outputs = []
    risk_outputs = []
    audit_outputs = []
    candidate_decisions = []
    for key in sorted(strategy_by_key):
        strategy_packet = strategy_by_key[key]
        risk_packet = risk_by_key.get(key, {})
        audit_packet = audit_by_key.get(key, {})
        base_candidate = base_candidate_by_key.get(key, {})
        strategy_recommendation = normalize_strategy_recommendation(strategy_packet.get("strategy_recommendation", "hold"))
        runtime_thesis = thesis_summary(strategy_packet, risk_packet)
        strategy_response_mode = "heuristic"
        risk_response_mode = "heuristic"
        audit_response_mode = "heuristic"
        strategy_runtime_output: dict[str, Any] | None = None
        strategy_runtime_packet = attach_runtime_memory_context(
            packet=strategy_packet,
            session_memory=session_memory,
            market_id=str(strategy_packet.get("market_id") or ""),
            outcome_id=str(strategy_packet.get("outcome_id") or ""),
        )
        risk_runtime_packet = attach_runtime_memory_context(
            packet=risk_packet,
            session_memory=session_memory,
            market_id=str(strategy_packet.get("market_id") or ""),
            outcome_id=str(strategy_packet.get("outcome_id") or ""),
        )
        audit_runtime_packet = attach_runtime_memory_context(
            packet=audit_packet,
            session_memory=session_memory,
            market_id=str(strategy_packet.get("market_id") or ""),
            outcome_id=str(strategy_packet.get("outcome_id") or ""),
        )
        if runtime_client is not None:
            strategy_runtime_output = runtime_client.strategy_decision(strategy_runtime_packet, default_thesis=runtime_thesis)
            strategy_recommendation = normalize_strategy_recommendation(strategy_runtime_output.get("strategy_recommendation", strategy_recommendation))
            runtime_thesis = str(strategy_runtime_output.get("thesis_summary") or runtime_thesis)
            strategy_response_mode = str(strategy_runtime_output.get("_response_mode", runtime_engine))
        runtime_risk_gate = normalize_risk_gate(risk_packet.get("risk_gate", "caution"))
        runtime_risk_reasons = list(risk_packet.get("risk_reasons") or ["runtime_risk_packet_missing"])
        if runtime_client is not None:
            risk_runtime_output = runtime_client.risk_decision(strategy_runtime_packet, risk_runtime_packet)
            runtime_risk_gate = normalize_risk_gate(risk_runtime_output.get("risk_gate", runtime_risk_gate))
            runtime_risk_reasons = normalize_risk_reasons(risk_runtime_output.get("risk_reasons"), fallback=runtime_risk_reasons)
            risk_response_mode = str(risk_runtime_output.get("_response_mode", runtime_engine))
        proposed_action = recommendation_to_action(strategy_recommendation, runtime_risk_gate)
        confidence = decision_confidence(strategy_packet, {"risk_gate": runtime_risk_gate})
        if strategy_runtime_output is not None:
            runtime_confidence = safe_confidence_value(strategy_runtime_output.get("confidence"))
            if runtime_confidence is not None:
                confidence = runtime_confidence
        decision_id = str(base_candidate.get("decision_id") or f"draft_{strategy_packet['outcome_id']}")
        event_id = str(base_candidate.get("event_id") or strategy_packet.get("event_id", ""))
        evidence_refs = list(base_candidate.get("evidence_refs") or audit_packet.get("evidence_refs") or [])
        audit_summary_text = (
            f"display_source={audit_packet.get('display_price_source')}, "
            f"signal_tags={','.join(audit_packet.get('explanatory_tags', []))}"
        )
        if runtime_client is not None:
            audit_runtime_output = runtime_client.audit_summary(audit_runtime_packet, fallback_summary=audit_summary_text)
            audit_summary_text = str(audit_runtime_output.get("trace_summary") or audit_summary_text)
            audit_response_mode = str(audit_runtime_output.get("_response_mode", runtime_engine))

        strategy_outputs.append(
            {
                "agent": "strategy_agent",
                "market_id": strategy_packet["market_id"],
                "outcome_id": strategy_packet["outcome_id"],
                "strategy_recommendation": strategy_recommendation,
                "proposed_action": proposed_action,
                "probability_edge": strategy_packet.get("probability_edge"),
                "robust_probability": strategy_packet.get("robust_probability"),
                "response_mode": strategy_response_mode,
            }
        )
        risk_outputs.append(
            {
                "agent": "risk_agent",
                "market_id": strategy_packet["market_id"],
                "outcome_id": strategy_packet["outcome_id"],
                "risk_gate": runtime_risk_gate,
                "risk_reasons": runtime_risk_reasons,
                "response_mode": risk_response_mode,
            }
        )
        audit_outputs.append(
            {
                "agent": "audit_agent",
                "market_id": strategy_packet["market_id"],
                "outcome_id": strategy_packet["outcome_id"],
                "evidence_refs": evidence_refs,
                "trace_summary": audit_summary_text,
                "response_mode": audit_response_mode,
            }
        )
        candidate_decisions.append(
            {
                "decision_id": decision_id,
                "event_id": event_id,
                "market_id": strategy_packet["market_id"],
                "outcome_id": strategy_packet["outcome_id"],
                "proposed_action": proposed_action,
                "confidence": confidence,
                "thesis_summary": runtime_thesis,
                "evidence_refs": evidence_refs,
                "created_by_agent": f"strategy_agent_{runtime_engine}_v0",
                "requires_risk_review": runtime_risk_gate != "allow",
                "risk_gate": runtime_risk_gate,
            }
        )

    runtime_context = copy.deepcopy(source_context)
    runtime_context["generated_at"] = utc_iso8601()
    runtime_context["source_agent_context_generated_at"] = source_context.get("generated_at")
    runtime_context["runtime_metadata"] = {
        "engine": runtime_engine,
        "session_id": session_id,
        "schema_version": "v0.1",
    }
    if runtime_client is not None:
        runtime_context["runtime_metadata"][runtime_engine] = runtime_client.stats()
    runtime_context["research_agent_results"] = research_outputs
    runtime_context["strategy_agent_results"] = strategy_outputs
    runtime_context["risk_agent_results"] = risk_outputs
    runtime_context["audit_agent_results"] = audit_outputs
    runtime_context["candidate_decisions"] = candidate_decisions

    trace = [
        {"step": "research_agent", "engine": runtime_engine, "inputs": len(source_context.get("research_agent_packets", [])), "outputs": len(research_outputs), "status": "ok"},
        {"step": "strategy_agent", "engine": runtime_engine, "inputs": len(source_context.get("strategy_agent_packets", [])), "outputs": len(strategy_outputs), "status": "ok"},
        {"step": "risk_agent", "engine": runtime_engine, "inputs": len(source_context.get("risk_agent_packets", [])), "outputs": len(risk_outputs), "status": "ok"},
        {"step": "audit_agent", "engine": runtime_engine, "inputs": len(source_context.get("audit_agent_packets", [])), "outputs": len(audit_outputs), "status": "ok"},
    ]
    return runtime_context, trace


def attach_runtime_memory_context(
    packet: dict[str, Any],
    session_memory: dict[str, Any] | None,
    market_id: str | None,
    outcome_id: str | None,
) -> dict[str, Any]:
    if not session_memory:
        return dict(packet)
    payload = dict(packet)
    payload["_runtime_memory_context"] = build_memory_context(
        session_memory=session_memory,
        market_id=market_id,
        outcome_id=outcome_id,
    )
    return payload


def recommendation_to_action(strategy_recommendation: str, risk_gate: str | None) -> str:
    if risk_gate == "block":
        return "hold"
    mapping = {
        "consider_buy": "buy",
        "consider_sell": "sell",
        "hold": "hold",
        "monitor": "hold",
    }
    return mapping.get(str(strategy_recommendation).strip().lower(), "hold")


def normalize_strategy_recommendation(value: Any) -> str:
    normalized = str(value or "hold").strip().lower()
    if normalized in {"consider_buy", "consider_sell", "hold", "monitor"}:
        return normalized
    return "hold"


def normalize_risk_gate(value: Any) -> str:
    normalized = str(value or "caution").strip().lower()
    if normalized in {"allow", "caution", "block"}:
        return normalized
    return "caution"


def normalize_risk_reasons(value: Any, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback
    reasons = [str(item).strip() for item in value if str(item).strip()]
    return reasons or fallback


def safe_confidence_value(value: Any) -> float | None:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return None
    return round(max(0.0, min(confidence, 1.0)), 6)


def decision_confidence(strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> float:
    edge = abs(float(strategy_packet.get("probability_edge", 0.0)))
    book = float(strategy_packet.get("book_reliability_score", 0.0))
    trade = float(strategy_packet.get("trade_reliability_score", 0.0))
    risk = float(strategy_packet.get("manipulation_risk_score", 0.0))
    score = min(1.0, edge * 5.0 + 0.4 * book + 0.3 * trade - 0.5 * risk)
    if risk_packet.get("risk_gate") == "block":
        score *= 0.25
    elif risk_packet.get("risk_gate") == "caution":
        score *= 0.6
    return round(max(0.0, score), 6)


def thesis_summary(strategy_packet: dict[str, Any], risk_packet: dict[str, Any]) -> str:
    return (
        f"Runtime strategy={strategy_packet.get('strategy_recommendation')}, "
        f"robust_probability={strategy_packet.get('robust_probability')}, "
        f"edge={strategy_packet.get('probability_edge')}, "
        f"risk_gate={risk_packet.get('risk_gate', 'caution')}."
    )


def utc_iso8601() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_adk_litellm_class() -> Any | None:
    candidates = [
        ("google.adk.models.lite_llm", "LiteLlm"),
        ("google.adk.models.lite_llm_model", "LiteLlm"),
        ("google.adk.models", "LiteLlm"),
    ]
    for module_name, class_name in candidates:
        try:
            module = importlib.import_module(module_name)
        except ModuleNotFoundError:
            continue
        klass = getattr(module, class_name, None)
        if klass is not None:
            return klass
    return None


def sanitize_session_id(value: str) -> str:
    sanitized = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in str(value))
    sanitized = sanitized.strip("_")
    return sanitized or "default"


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import argparse
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
    from .build_decision_records import build_decision_records
    from .build_order_proposals import build_order_proposals
    from .evaluate_risk_policy_gate import evaluate_gate
else:
    from build_decision_records import build_decision_records
    from build_order_proposals import build_order_proposals
    from evaluate_risk_policy_gate import evaluate_gate


DEFAULT_PORTFOLIO_ID = "pf_main"
DEFAULT_ORDER_TYPE = "limit"
DEFAULT_RUNTIME_ENGINE = "heuristic"
DEFAULT_LLM_BASE_URL = "https://api.openai.com/v1"
DEFAULT_LLM_MODEL = "gpt-4o-mini"
DEFAULT_LLM_API_KEY_ENV = "OPENAI_API_KEY"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a minimal multi-agent runtime skeleton over multi-agent context and "
            "bridge into DecisionRecord -> RiskPolicy gate -> Order proposal."
        )
    )
    parser.add_argument("--agent-context", required=True, help="Path to the multi-agent context JSON.")
    parser.add_argument("--execution-bundle", required=True, help="Path to fund execution bundle JSON.")
    parser.add_argument("--output", required=True, help="Path to write runtime output JSON.")
    parser.add_argument(
        "--runtime-engine",
        choices=["heuristic", "adk", "llm"],
        default=DEFAULT_RUNTIME_ENGINE,
        help="Runtime orchestrator backend. adk is optional adapter; llm uses OpenAI-compatible chat completions.",
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


def main() -> int:
    args = parse_args()
    source_context = json.loads(Path(args.agent_context).read_text(encoding="utf-8"))
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
    result = run_runtime(
        agent_context=source_context,
        execution_bundle=execution_bundle,
        runtime_engine=args.runtime_engine,
        session_id=args.session_id,
        portfolio_id=args.portfolio_id,
        policy_id=args.policy_id,
        default_order_size_usd=args.default_order_size_usd,
        include_hold=args.include_hold,
        order_type=args.order_type,
        llm_config=llm_config,
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
    execution_bundle: dict[str, Any],
    runtime_engine: str,
    session_id: str,
    portfolio_id: str,
    policy_id: str | None,
    default_order_size_usd: float,
    include_hold: bool,
    order_type: str,
    llm_config: LLMRuntimeConfig | None = None,
) -> dict[str, Any]:
    llm_runtime = ensure_runtime_engine(runtime_engine, llm_config=llm_config)
    runtime_context, trace = build_runtime_agent_context(
        source_context=agent_context,
        runtime_engine=runtime_engine,
        session_id=session_id,
        llm_runtime=llm_runtime,
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
    return {
        "schema_version": "v0.1",
        "generated_at": utc_iso8601(),
        "runtime_engine": runtime_engine,
        "session_id": session_id,
        "source_agent_context_generated_at": agent_context.get("generated_at"),
        "orchestration_trace": trace,
        "runtime_agent_context": runtime_context,
        "decision_records_payload": decision_records_payload,
        "risk_gate_payload": risk_gate_payload,
        "order_proposals_payload": order_proposals_payload,
    }


def ensure_runtime_engine(runtime_engine: str, llm_config: LLMRuntimeConfig | None) -> LLMRuntime | None:
    if runtime_engine != "adk":
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
        return None
    try:
        importlib.import_module("google.adk")
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "runtime-engine=adk requested but google-adk is not installed. "
            "Install ADK dependencies first, or run with --runtime-engine heuristic."
        ) from exc
    return None


def build_runtime_agent_context(
    source_context: dict[str, Any],
    runtime_engine: str,
    session_id: str,
    llm_runtime: LLMRuntime | None,
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
        summary = (
            f"category={packet.get('category')}, trading_state={packet.get('trading_state')}, "
            f"news_count={len(packet.get('related_news_signals', []))}, outcomes={len(packet.get('outcomes', []))}"
        )
        response_mode = "heuristic"
        if llm_runtime is not None:
            llm_output = llm_runtime.research_summary(packet)
            summary = str(llm_output.get("summary") or summary)
            response_mode = str(llm_output.get("_response_mode", "llm"))
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
        if llm_runtime is not None:
            strategy_llm_output = llm_runtime.strategy_decision(strategy_packet, default_thesis=runtime_thesis)
            strategy_recommendation = normalize_strategy_recommendation(strategy_llm_output.get("strategy_recommendation", strategy_recommendation))
            runtime_thesis = str(strategy_llm_output.get("thesis_summary") or runtime_thesis)
            strategy_response_mode = str(strategy_llm_output.get("_response_mode", "llm"))
        runtime_risk_gate = normalize_risk_gate(risk_packet.get("risk_gate", "caution"))
        runtime_risk_reasons = list(risk_packet.get("risk_reasons") or ["runtime_risk_packet_missing"])
        if llm_runtime is not None:
            risk_llm_output = llm_runtime.risk_decision(strategy_packet, risk_packet)
            runtime_risk_gate = normalize_risk_gate(risk_llm_output.get("risk_gate", runtime_risk_gate))
            runtime_risk_reasons = normalize_risk_reasons(risk_llm_output.get("risk_reasons"), fallback=runtime_risk_reasons)
            risk_response_mode = str(risk_llm_output.get("_response_mode", "llm"))
        proposed_action = recommendation_to_action(strategy_recommendation, runtime_risk_gate)
        confidence = decision_confidence(strategy_packet, {"risk_gate": runtime_risk_gate})
        if llm_runtime is not None:
            llm_confidence = safe_confidence_value(strategy_llm_output.get("confidence"))
            if llm_confidence is not None:
                confidence = llm_confidence
        decision_id = str(base_candidate.get("decision_id") or f"draft_{strategy_packet['outcome_id']}")
        event_id = str(base_candidate.get("event_id") or strategy_packet.get("event_id", ""))
        evidence_refs = list(base_candidate.get("evidence_refs") or audit_packet.get("evidence_refs") or [])
        audit_summary_text = (
            f"display_source={audit_packet.get('display_price_source')}, "
            f"signal_tags={','.join(audit_packet.get('explanatory_tags', []))}"
        )
        if llm_runtime is not None:
            audit_llm_output = llm_runtime.audit_summary(audit_packet, fallback_summary=audit_summary_text)
            audit_summary_text = str(audit_llm_output.get("trace_summary") or audit_summary_text)
            audit_response_mode = str(audit_llm_output.get("_response_mode", "llm"))

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
    if llm_runtime is not None:
        runtime_context["runtime_metadata"]["llm"] = llm_runtime.stats()
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


if __name__ == "__main__":
    raise SystemExit(main())

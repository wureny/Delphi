/**
 * Product-shaped runtime composition.
 *
 * Raw environment values enter only here. The returned capability descriptor
 * is safe to serialize: it never contains credentials, raw provider errors,
 * or vendor SDK objects. Fixture analysis remains the complete runnable path.
 */
import { z } from "zod";
import type { WorkflowRunBundle } from "@/domain/types";
import { FixtureAnalysisAdapter, type AnalysisAdapter } from "./adapter";
import { DeterministicGraphProjectionPort, type GraphProjectionPort } from "./graph";

export type AnalysisMode = "fixture" | "live";
export type GraphMode = "projection" | "disabled";
export type CapabilityState = "fixture" | "configured_live" | "projection_only" | "degraded" | "unavailable";

export interface AnalysisCapabilityDescriptor {
  requestedMode: AnalysisMode;
  configurationState: "fixture" | "configured_live" | "unavailable";
  activeMode: "fixture";
  state: "fixture" | "degraded";
  label: string;
  reasonCode?: "live_configuration_incomplete" | "live_adapter_unavailable" | "runtime_configuration_invalid";
}

export interface GraphCapabilityDescriptor {
  requestedMode: GraphMode;
  activeMode: "projection" | "disabled";
  state: "projection_only" | "unavailable";
  label: string;
  reasonCode?: "graph_disabled" | "runtime_configuration_invalid";
}

export interface RuntimeCapabilities {
  analysis: AnalysisCapabilityDescriptor;
  graph: GraphCapabilityDescriptor;
  externalNetworkAccess: false;
  canonicalWriteAuthority: "human_transition_gateway_only";
}

interface LiveProviderConfiguration {
  provider: string;
  model: string;
  apiKey: string;
}

interface ParsedRuntimeConfiguration {
  requestedAnalysisMode: AnalysisMode;
  graphMode: GraphMode;
  liveProvider?: LiveProviderConfiguration;
  safeErrorCode?: AnalysisCapabilityDescriptor["reasonCode"];
}

export interface RuntimeComposition {
  analysisAdapter: AnalysisAdapter;
  graphProjection: GraphProjectionPort | null;
  capabilities: RuntimeCapabilities;
}

const rawRuntimeSchema = z
  .object({
    DELPHI_ANALYSIS_MODE: z.enum(["fixture", "live"]).optional(),
    DELPHI_LIVE_ADAPTER_ENABLED: z.enum(["true", "false"]).optional(),
    DELPHI_LIVE_MODEL_PROVIDER: z.string().optional(),
    DELPHI_LIVE_MODEL_NAME: z.string().optional(),
    DELPHI_LIVE_MODEL_API_KEY: z.string().optional(),
    DELPHI_GRAPH_MODE: z.enum(["projection", "disabled"]).optional(),
  })
  .passthrough();

const FALLBACK_CONFIG: ParsedRuntimeConfiguration = {
  requestedAnalysisMode: "fixture",
  graphMode: "projection",
};

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseRuntimeConfiguration(raw: Record<string, string | undefined>): ParsedRuntimeConfiguration {
  const parsed = rawRuntimeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...FALLBACK_CONFIG, safeErrorCode: "runtime_configuration_invalid" };
  }

  const requestedAnalysisMode: AnalysisMode =
    parsed.data.DELPHI_ANALYSIS_MODE ??
    (parsed.data.DELPHI_LIVE_ADAPTER_ENABLED === "true" ? "live" : "fixture");
  const graphMode = parsed.data.DELPHI_GRAPH_MODE ?? "projection";

  if (requestedAnalysisMode === "fixture") {
    return { requestedAnalysisMode, graphMode };
  }

  const provider = nonEmpty(parsed.data.DELPHI_LIVE_MODEL_PROVIDER);
  const model = nonEmpty(parsed.data.DELPHI_LIVE_MODEL_NAME);
  const apiKey = nonEmpty(parsed.data.DELPHI_LIVE_MODEL_API_KEY);
  if (!provider || !model || !apiKey) {
    return {
      requestedAnalysisMode,
      graphMode,
      safeErrorCode: "live_configuration_incomplete",
    };
  }

  return {
    requestedAnalysisMode,
    graphMode,
    liveProvider: { provider, model, apiKey },
  };
}

export function createRuntimeComposition(
  raw: Record<string, string | undefined>,
  bundles: { success: WorkflowRunBundle; degraded: WorkflowRunBundle },
): RuntimeComposition {
  const config = parseRuntimeConfiguration(raw);
  const liveRequested = config.requestedAnalysisMode === "live";
  const liveUnavailableReason = liveRequested
    ? config.safeErrorCode ?? "live_adapter_unavailable"
    : config.safeErrorCode;
  const invalidRuntime = config.safeErrorCode === "runtime_configuration_invalid";
  const graphActive = config.graphMode === "projection" && !invalidRuntime;

  return {
    // Live execution is deliberately not implemented in this change. Even a
    // complete configuration fails safely to the deterministic adapter.
    analysisAdapter: new FixtureAnalysisAdapter(bundles),
    graphProjection: graphActive ? new DeterministicGraphProjectionPort() : null,
    capabilities: {
      analysis: liveRequested || invalidRuntime
        ? {
            requestedMode: config.requestedAnalysisMode,
            configurationState: config.liveProvider ? "configured_live" : "unavailable",
            activeMode: "fixture",
            state: "degraded",
            label: "Deterministic fixture analysis (safe fallback)",
            reasonCode: liveUnavailableReason,
          }
        : {
            requestedMode: "fixture",
            configurationState: "fixture",
            activeMode: "fixture",
            state: "fixture",
            label: "Deterministic fixture analysis",
          },
      graph: graphActive
        ? {
            requestedMode: "projection",
            activeMode: "projection",
            state: "projection_only",
            label: "Read-only in-memory graph projection",
          }
        : {
            requestedMode: config.graphMode,
            activeMode: "disabled",
            state: "unavailable",
            label: "Graph projection unavailable",
            reasonCode: invalidRuntime ? "runtime_configuration_invalid" : "graph_disabled",
          },
      externalNetworkAccess: false,
      canonicalWriteAuthority: "human_transition_gateway_only",
    },
  };
}

import { describe, expect, it } from "vitest";
import { createRuntimeComposition } from "@/runtime/config";
import { successRun, degradedRun } from "@/fixtures/loader";

const bundles = { success: successRun, degraded: degradedRun };

describe("runtime composition", () => {
  it("selects fixture analysis and projection-only graph by default", () => {
    const composition = createRuntimeComposition({}, bundles);
    expect(composition.capabilities.analysis).toMatchObject({
      requestedMode: "fixture",
      configurationState: "fixture",
      activeMode: "fixture",
      state: "fixture",
    });
    expect(composition.capabilities.graph).toMatchObject({
      activeMode: "projection",
      state: "projection_only",
    });
    expect(composition.graphProjection).not.toBeNull();
  });

  it("fails incomplete live configuration closed to an explicit fixture fallback", () => {
    const composition = createRuntimeComposition({ DELPHI_ANALYSIS_MODE: "live" }, bundles);
    expect(composition.capabilities.analysis).toMatchObject({
      requestedMode: "live",
      configurationState: "unavailable",
      activeMode: "fixture",
      state: "degraded",
      reasonCode: "live_configuration_incomplete",
    });
  });

  it("reports a configured live request as unavailable until an adapter exists", () => {
    const composition = createRuntimeComposition(
      {
        DELPHI_ANALYSIS_MODE: "live",
        DELPHI_LIVE_MODEL_PROVIDER: "provider-x",
        DELPHI_LIVE_MODEL_NAME: "model-y",
        DELPHI_LIVE_MODEL_API_KEY: "super-secret-key",
      },
      bundles,
    );
    expect(composition.capabilities.analysis.configurationState).toBe("configured_live");
    expect(composition.capabilities.analysis.reasonCode).toBe("live_adapter_unavailable");
    expect(JSON.stringify(composition.capabilities)).not.toContain("super-secret-key");
    expect(JSON.stringify(composition.capabilities)).not.toContain("provider-x");
  });

  it("rejects unknown runtime modes without guessing a live provider", () => {
    const composition = createRuntimeComposition(
      { DELPHI_ANALYSIS_MODE: "mystery", DELPHI_GRAPH_MODE: "database" },
      bundles,
    );
    expect(composition.capabilities.analysis.reasonCode).toBe("runtime_configuration_invalid");
    expect(composition.capabilities.analysis.activeMode).toBe("fixture");
    expect(composition.capabilities.graph).toMatchObject({
      activeMode: "disabled",
      state: "unavailable",
      reasonCode: "runtime_configuration_invalid",
    });
    expect(composition.graphProjection).toBeNull();
  });

  it("supports explicitly disabling the graph without affecting analysis", () => {
    const composition = createRuntimeComposition({ DELPHI_GRAPH_MODE: "disabled" }, bundles);
    expect(composition.capabilities.analysis.state).toBe("fixture");
    expect(composition.capabilities.graph.reasonCode).toBe("graph_disabled");
    expect(composition.graphProjection).toBeNull();
  });
});

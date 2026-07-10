import { describe, expect, it } from "vitest";
import {
  ServerConfigurationError,
  defaultServerConfig,
  resolveServerConfig,
} from "./serverConfig";

describe("server configuration", () => {
  it("resolves the supported local composition explicitly", () => {
    expect(resolveServerConfig()).toEqual(defaultServerConfig);
    expect(resolveServerConfig({ repositoryMode: "fixture", financialDataProviderMode: "mock" })).toEqual({
      repositoryMode: "fixture",
      financialDataProviderMode: "mock",
    });
  });

  it("fails closed for unsupported repository modes without echoing the value", () => {
    const unsupported = "future-repository-with-secret";

    expect(() => resolveServerConfig({ repositoryMode: unsupported })).toThrow(ServerConfigurationError);
    expect(() => resolveServerConfig({ repositoryMode: unsupported })).toThrow("Unsupported workspace repository mode.");

    try {
      resolveServerConfig({ repositoryMode: unsupported });
    } catch (error) {
      expect(String(error)).not.toContain(unsupported);
    }
  });

  it("fails closed for unsupported provider modes without silently using mock", () => {
    const unsupported = "live-provider-with-secret";

    expect(() => resolveServerConfig({ financialDataProviderMode: unsupported })).toThrow(
      "Unsupported financial-data provider mode.",
    );

    try {
      resolveServerConfig({ financialDataProviderMode: unsupported });
    } catch (error) {
      expect(String(error)).not.toContain(unsupported);
    }
  });
});

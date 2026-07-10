import { describe, expect, it } from "vitest";
import { NodeServerConfigurationError, resolveNodeServerConfig } from "./nodeServerConfig";

describe("Node server configuration", () => {
  it("resolves explicit defaults for a local deployable server", () => {
    expect(resolveNodeServerConfig()).toEqual({
      host: "127.0.0.1",
      port: 8787,
      allowedOrigins: ["http://127.0.0.1:5173", "http://localhost:5173"],
      bodyLimitBytes: 1_048_576,
      requestTimeoutMs: 15_000,
      composition: { repositoryMode: "fixture", financialDataProviderMode: "mock" },
    });
  });

  it.each([
    [{ PORT: "0" }, "Server port configuration is invalid."],
    [{ PORT: "70000" }, "Server port configuration is invalid."],
    [{ DELPHI_BODY_LIMIT_BYTES: "unbounded" }, "Server body limit configuration is invalid."],
    [{ DELPHI_REQUEST_TIMEOUT_MS: "1" }, "Server request timeout configuration is invalid."],
    [{ DELPHI_CORS_ORIGINS: "javascript:alert(1)" }, "Server CORS origin configuration is invalid."],
    [{ HOST: "http://bad-host" }, "Server host configuration is invalid."],
  ])("rejects invalid environment values", (env, message) => {
    expect(() => resolveNodeServerConfig(env)).toThrow(NodeServerConfigurationError);
    expect(() => resolveNodeServerConfig(env)).toThrow(message);
  });

  it("does not echo unsupported backend values", () => {
    const secretValue = "future-backend-secret";

    try {
      resolveNodeServerConfig({ DELPHI_REPOSITORY_MODE: secretValue });
    } catch (error) {
      expect(String(error)).toBe("NodeServerConfigurationError: Server backend configuration is unsupported.");
      expect(String(error)).not.toContain(secretValue);
    }
  });
});

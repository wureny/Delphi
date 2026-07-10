import { resolveServerConfig } from "./serverConfig";
import type { ServerConfig } from "./serverConfig";

const DEFAULT_BODY_LIMIT_BYTES = 1_048_576;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_BODY_LIMIT_BYTES = 10_485_760;
const MAX_REQUEST_TIMEOUT_MS = 120_000;

export interface NodeServerEnvironment {
  [key: string]: string | undefined;
  HOST?: string;
  PORT?: string;
  DELPHI_CORS_ORIGINS?: string;
  DELPHI_BODY_LIMIT_BYTES?: string;
  DELPHI_REQUEST_TIMEOUT_MS?: string;
  DELPHI_REPOSITORY_MODE?: string;
  DELPHI_FINANCIAL_DATA_PROVIDER_MODE?: string;
}

export interface NodeServerConfig {
  host: string;
  port: number;
  allowedOrigins: string[];
  bodyLimitBytes: number;
  requestTimeoutMs: number;
  composition: ServerConfig;
}

export class NodeServerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NodeServerConfigurationError";
  }
}

export function resolveNodeServerConfig(env: NodeServerEnvironment = {}): NodeServerConfig {
  const host = env.HOST ?? "127.0.0.1";
  if (!validHost(host)) {
    throw new NodeServerConfigurationError("Server host configuration is invalid.");
  }

  const port = integerSetting(env.PORT ?? "8787", 1, 65_535, "Server port configuration is invalid.");
  const bodyLimitBytes = integerSetting(
    env.DELPHI_BODY_LIMIT_BYTES ?? String(DEFAULT_BODY_LIMIT_BYTES),
    1,
    MAX_BODY_LIMIT_BYTES,
    "Server body limit configuration is invalid.",
  );
  const requestTimeoutMs = integerSetting(
    env.DELPHI_REQUEST_TIMEOUT_MS ?? String(DEFAULT_REQUEST_TIMEOUT_MS),
    100,
    MAX_REQUEST_TIMEOUT_MS,
    "Server request timeout configuration is invalid.",
  );
  const allowedOrigins = parseOrigins(
    env.DELPHI_CORS_ORIGINS ?? "http://127.0.0.1:5173,http://localhost:5173",
  );

  let composition: ServerConfig;
  try {
    composition = resolveServerConfig({
      repositoryMode: env.DELPHI_REPOSITORY_MODE,
      financialDataProviderMode: env.DELPHI_FINANCIAL_DATA_PROVIDER_MODE,
    });
  } catch {
    throw new NodeServerConfigurationError("Server backend configuration is unsupported.");
  }

  return {
    host,
    port,
    allowedOrigins,
    bodyLimitBytes,
    requestTimeoutMs,
    composition,
  };
}

function integerSetting(value: string, min: number, max: number, message: string): number {
  if (!/^\d+$/.test(value)) throw new NodeServerConfigurationError(message);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new NodeServerConfigurationError(message);
  }
  return parsed;
}

function validHost(value: string): boolean {
  return value.length > 0 && value.length <= 253 && !/[\s/]/.test(value) && !value.includes("://");
}

function parseOrigins(value: string): string[] {
  const origins = value.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0 || origins.some((origin) => !validOrigin(origin))) {
    throw new NodeServerConfigurationError("Server CORS origin configuration is invalid.");
  }
  return [...new Set(origins)];
}

function validOrigin(value: string): boolean {
  if (value === "*") return true;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.origin === value;
  } catch {
    return false;
  }
}

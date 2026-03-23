import { DelphiFrontendApp } from "./app.js";
import type { FeedMode } from "./feeds.js";

declare global {
  interface Window {
    __DELHI_FRONTEND_CONFIG__?: {
      runtimeApiBaseUrl?: string;
    };
  }
}

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Unable to find #app container.");
}

const searchParams = new URLSearchParams(window.location.search);
const explicitSource = searchParams.get("source");
const recordedFixtureUrl =
  searchParams.get("fixture") ?? "./public/fixtures/runtime-demo.json";
const configuredRuntimeApiBaseUrl =
  searchParams.get("runtime") ??
  window.__DELHI_FRONTEND_CONFIG__?.runtimeApiBaseUrl;
const runtimeApiBaseUrl =
  configuredRuntimeApiBaseUrl ??
  deriveLocalRuntimeApiBaseUrl();
const feedMode = resolveFeedMode(explicitSource, configuredRuntimeApiBaseUrl);
const runtimeRunKey = searchParams.get("run") ?? undefined;
const derivedEventsUrl = runtimeRunKey && runtimeApiBaseUrl
  ? `${runtimeApiBaseUrl}/runs/${encodeURIComponent(runtimeRunKey)}/events`
  : undefined;
const derivedSnapshotUrl = runtimeRunKey && runtimeApiBaseUrl
  ? `${runtimeApiBaseUrl}/runs/${encodeURIComponent(runtimeRunKey)}/report`
  : undefined;
const derivedTerminalsUrl = runtimeRunKey && runtimeApiBaseUrl
  ? `${runtimeApiBaseUrl}/runs/${encodeURIComponent(runtimeRunKey)}/terminals`
  : undefined;
const derivedTerminalStreamUrl = runtimeRunKey && runtimeApiBaseUrl
  ? `${runtimeApiBaseUrl}/runs/${encodeURIComponent(runtimeRunKey)}/terminal-stream`
  : undefined;
const sseEventsUrl = searchParams.get("events") ?? derivedEventsUrl;
const sseSnapshotUrl = searchParams.get("snapshot") ?? derivedSnapshotUrl;
const sseTerminalsUrl = searchParams.get("terminals") ?? derivedTerminalsUrl;
const sseTerminalStreamUrl =
  searchParams.get("terminalStream") ?? derivedTerminalStreamUrl;

const appConfig = {
  root,
  feedMode,
  recordedFixtureUrl,
  ...(feedMode === "sse" && runtimeApiBaseUrl ? { runtimeApiBaseUrl } : {}),
  ...(feedMode === "sse" && runtimeRunKey ? { runtimeRunKey } : {}),
  ...(sseEventsUrl ? { sseEventsUrl } : {}),
  ...(sseSnapshotUrl ? { sseSnapshotUrl } : {}),
  ...(sseTerminalsUrl ? { sseTerminalsUrl } : {}),
  ...(sseTerminalStreamUrl ? { sseTerminalStreamUrl } : {}),
};

const app = new DelphiFrontendApp(appConfig);

app.mount();

function deriveLocalRuntimeApiBaseUrl(): string | undefined {
  const { hostname, protocol } = window.location;

  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    return undefined;
  }

  return `${protocol}//127.0.0.1:8787`;
}

function resolveFeedMode(
  explicitSource: string | null,
  configuredRuntimeApiBaseUrl: string | undefined,
): FeedMode {
  if (explicitSource === "recorded") {
    return "recorded";
  }

  if (explicitSource === "sse") {
    return "sse";
  }

  return configuredRuntimeApiBaseUrl ? "sse" : "recorded";
}

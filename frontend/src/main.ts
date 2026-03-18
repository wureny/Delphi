import { DelphiFrontendApp } from "./app.js";
import type { FeedMode } from "./feeds.js";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Unable to find #app container.");
}

const searchParams = new URLSearchParams(window.location.search);
const feedMode = (searchParams.get("source") === "sse" ? "sse" : "recorded") as FeedMode;
const recordedFixtureUrl =
  searchParams.get("fixture") ?? "./public/fixtures/runtime-demo.json";
const runtimeApiBaseUrl = searchParams.get("runtime") ?? "http://127.0.0.1:8787";
const runtimeRunKey = searchParams.get("run") ?? "demo";
const derivedEventsUrl = `${runtimeApiBaseUrl}/runs/${encodeURIComponent(runtimeRunKey)}/events`;
const derivedSnapshotUrl = `${runtimeApiBaseUrl}/runs/${encodeURIComponent(runtimeRunKey)}/report`;
const sseEventsUrl = searchParams.get("events") ?? derivedEventsUrl;
const sseSnapshotUrl = searchParams.get("snapshot") ?? derivedSnapshotUrl;

const app = new DelphiFrontendApp({
  root,
  feedMode,
  recordedFixtureUrl,
  ...(feedMode === "sse" ? { runtimeApiBaseUrl, runtimeRunKey } : {}),
  ...(sseEventsUrl ? { sseEventsUrl } : {}),
  ...(sseSnapshotUrl ? { sseSnapshotUrl } : {}),
});

app.mount();

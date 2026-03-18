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
const sseEventsUrl = searchParams.get("events") ?? undefined;
const sseSnapshotUrl = searchParams.get("snapshot") ?? undefined;

const app = new DelphiFrontendApp({
  root,
  feedMode,
  recordedFixtureUrl,
  ...(sseEventsUrl ? { sseEventsUrl } : {}),
  ...(sseSnapshotUrl ? { sseSnapshotUrl } : {}),
});

app.mount();

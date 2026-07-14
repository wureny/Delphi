import { describe, expect, it } from "vitest";
import { FixtureAnalysisAdapter } from "@/runtime/adapter";
import { successRun, degradedRun } from "@/fixtures/loader";
import type { RunEvent } from "@/domain/types";

const adapter = new FixtureAnalysisAdapter({ success: successRun, degraded: degradedRun });

async function collect(kind: "success" | "degraded"): Promise<RunEvent[]> {
  const events: RunEvent[] = [];
  for await (const event of adapter.run({
    caseId: "case_arct_001",
    domainEventId: "event_arct_fy26_q2",
    runKind: kind,
    eventDelayMs: 0,
  })) {
    events.push(event);
  }
  return events;
}

describe("FixtureAnalysisAdapter", () => {
  it("replays the successful run deterministically and in order", async () => {
    const events = await collect("success");
    expect(events).toEqual(successRun.events);
    expect(events[0]?.eventType).toBe("run_created");
    expect(events[events.length - 1]?.eventType).toBe("run_completed");
  });

  it("replays the degraded run with explicit source_unavailable and degraded_mode_entered events", async () => {
    const events = await collect("degraded");
    expect(events).toEqual(degradedRun.events);
    expect(events.map((e) => e.eventType)).toContain("source_unavailable");
    expect(events.map((e) => e.eventType)).toContain("degraded_mode_entered");
  });

  it("is repeatable — two replays yield identical event sequences", async () => {
    expect(await collect("success")).toEqual(await collect("success"));
  });
});

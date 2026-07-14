/**
 * Analysis adapter boundary.
 *
 * The product consumes analysis strictly through this interface. The fixture
 * adapter is the canonical public-demo path; a live-model adapter may exist
 * behind the same interface but is never required to complete the demo.
 */
import type { RunEvent, WorkflowRunBundle } from "@/domain/types";

export interface AnalysisInput {
  caseId: string;
  domainEventId: string;
  runKind: "success" | "degraded";
  /** Delay between emitted events in ms. 0 = synchronous (tests). */
  eventDelayMs?: number;
  signal?: AbortSignal;
}

export interface AnalysisAdapter {
  run(input: AnalysisInput): AsyncIterable<RunEvent>;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

/**
 * Deterministic replay of a recorded fixture run. Every emitted event is a
 * real, schema-validated fixture object — the animation corresponds 1:1 to
 * fixture-backed events, never to fabricated reasoning.
 */
export class FixtureAnalysisAdapter implements AnalysisAdapter {
  constructor(
    private readonly bundles: { success: WorkflowRunBundle; degraded: WorkflowRunBundle },
    private readonly defaultDelayMs = 420,
  ) {}

  async *run(input: AnalysisInput): AsyncIterable<RunEvent> {
    const bundle = input.runKind === "degraded" ? this.bundles.degraded : this.bundles.success;
    const delay = input.eventDelayMs ?? this.defaultDelayMs;
    for (const event of bundle.events) {
      if (delay > 0) await sleep(delay, input.signal);
      if (input.signal?.aborted) return;
      yield event;
    }
  }
}

/**
 * Optional live-model adapter boundary.
 *
 * Deliberately unimplemented in the public prototype: it requires server-side
 * environment configuration, must validate structured output, and can never
 * write canonical state. The UI hides live mode entirely when the environment
 * is not configured, and the public demo never depends on it.
 */
export class LiveModelAnalysisAdapter implements AnalysisAdapter {
  // eslint-disable-next-line require-yield
  async *run(_input: AnalysisInput): AsyncIterable<RunEvent> {
    throw new Error(
      "Live-model mode is not configured. The public demo runs in deterministic fixture mode.",
    );
  }
}

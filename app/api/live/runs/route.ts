/**
 * Start a live Earnings-to-Thesis run and stream its progress as NDJSON:
 *   {"type":"event","event":RunEvent} … then {"type":"result","result":LiveRunResult}
 *   or {"type":"error","code":…,"message":…}
 */
import { z } from "zod";
import { thesisSnapshotSchema } from "@/domain/schemas";
import type { ThesisSnapshot } from "@/domain/types";
import {
  AnalysisModelError,
  createAnalysisModel,
  EdgarClient,
  EdgarError,
  filingToDomainEvent,
  releaseToSourceBundle,
  runEarningsToThesis,
} from "@/engine";
import { authorizeLiveRequest, liveCapability } from "@/engine/server/live-access";
import { presetFor } from "@/live/presets";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z.-]{0,6}$/),
  thesis: thesisSnapshotSchema.optional(),
  effort: z.enum(["low", "medium", "high", "xhigh"]).optional(),
});

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ type: "error", code, message }, { status });
}

export async function POST(request: Request) {
  const env = process.env;
  const cap = liveCapability(env);
  if (!cap.enabled || !cap.selection) {
    return errorResponse(503, cap.reason ?? "live_disabled", "Live analysis is not configured on this server.");
  }
  if (!authorizeLiveRequest(env, request.headers.get("x-delphi-live-token"))) {
    return errorResponse(401, "access_denied", "A valid live-access token is required.");
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(400, "bad_request", "Provide a ticker and, optionally, a valid thesis.");
  const { ticker, effort } = parsed.data;
  const thesis = (parsed.data.thesis ?? presetFor(ticker)?.thesis) as ThesisSnapshot | undefined;
  if (!thesis) return errorResponse(400, "thesis_required", `No thesis preset for ${ticker}; supply a thesis.`);

  const selection = { ...cap.selection, ...(effort ? { effort } : {}) };
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      try {
        const edgar = new EdgarClient({ userAgent: env.DELPHI_SEC_USER_AGENT! });
        const release = await edgar.latestEarningsRelease(ticker);
        const result = await runEarningsToThesis(
          {
            tenantId: "tenant_delphi_live",
            caseId: thesis.caseId,
            companyName: release.filing.companyName,
            ticker,
            thesis,
            event: filingToDomainEvent(release.filing, release.retrievedAt),
            sources: [releaseToSourceBundle(release)],
            signal: request.signal,
          },
          createAnalysisModel(selection),
          (event) => send({ type: "event", event }),
        );
        send({ type: "result", result });
      } catch (error) {
        if (error instanceof EdgarError) send({ type: "error", code: `sec_${error.code}`, message: error.message });
        else if (error instanceof AnalysisModelError) send({ type: "error", code: `model_${error.code}`, message: error.message });
        else send({ type: "error", code: "internal", message: "The run failed unexpectedly. No proposals were produced." });
        if (!(error instanceof EdgarError || error instanceof AnalysisModelError)) console.error("live run failed", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

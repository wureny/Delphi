import { liveCapability } from "@/engine/server/live-access";

export const dynamic = "force-dynamic";

export function GET() {
  const cap = liveCapability(process.env);
  return Response.json({
    enabled: cap.enabled,
    requiresToken: cap.requiresToken,
    reason: cap.reason ?? null,
    provider: cap.selection?.provider ?? null,
    model: cap.selection?.model ?? null,
    effort: cap.selection?.effort ?? null,
  });
}

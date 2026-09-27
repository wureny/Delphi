/**
 * Live-analysis capability and access control (server-only).
 *
 * Live runs spend model credits and call SEC EDGAR, so they are off unless
 * fully configured, and in production they require a shared access token.
 */
import { resolveModelSelection, type ModelSelection } from "@/engine/analysis/select-model";

export interface LiveCapability {
  enabled: boolean;
  requiresToken: boolean;
  selection?: ModelSelection;
  reason?: "provider_key_missing" | "sec_user_agent_missing" | "access_token_missing";
}

type Env = Record<string, string | undefined>;

export function liveCapability(env: Env): LiveCapability {
  const production = env.NODE_ENV === "production";
  const requiresToken = production || Boolean(env.DELPHI_LIVE_ACCESS_TOKEN);
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) return { enabled: false, requiresToken, reason: "provider_key_missing" };
  if (!env.DELPHI_SEC_USER_AGENT) return { enabled: false, requiresToken, reason: "sec_user_agent_missing" };
  if (production && !env.DELPHI_LIVE_ACCESS_TOKEN) return { enabled: false, requiresToken, reason: "access_token_missing" };
  return { enabled: true, requiresToken, selection: resolveModelSelection(env) };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the request may start a live run. */
export function authorizeLiveRequest(env: Env, presentedToken: string | null): boolean {
  const cap = liveCapability(env);
  if (!cap.enabled) return false;
  if (!cap.requiresToken) return true;
  const expected = env.DELPHI_LIVE_ACCESS_TOKEN ?? "";
  return Boolean(expected) && timingSafeEqual(presentedToken ?? "", expected);
}

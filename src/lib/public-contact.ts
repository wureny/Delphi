const DEFAULT_PUBLIC_CONTACT_EMAIL = "alixwu2004@gmail.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_DOMAINS = new Set(["example", "example.com", "example.org", "example.net", "invalid", "localhost"]);

/** Resolve a public contact address without ever rendering a placeholder. */
export function resolvePublicContactEmail(configured: string | undefined): string | null {
  const candidate = configured === undefined ? DEFAULT_PUBLIC_CONTACT_EMAIL : configured.trim();
  if (!EMAIL_PATTERN.test(candidate)) return null;
  const domain = candidate.split("@")[1]?.toLowerCase();
  if (!domain || RESERVED_DOMAINS.has(domain) || domain.endsWith(".example")) return null;
  return candidate;
}

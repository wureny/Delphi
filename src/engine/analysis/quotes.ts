/**
 * Verbatim-quote verification.
 *
 * A citation is only as good as its quote: the model must copy text that
 * actually exists in the excerpt it cites. Matching tolerates whitespace,
 * case, and typographic punctuation differences, and "..." elisions between
 * fragments that appear in order — nothing else.
 */
import { normalizeText } from "@/engine/sec/html-to-blocks";

function canon(text: string): string {
  return normalizeText(text).toLowerCase();
}

export function quoteAppearsIn(quote: string, excerptText: string): boolean {
  const haystack = canon(excerptText);
  const fragments = quote
    .split(/\.\.\.|…/)
    .map((f) => canon(f).replace(/^[\s"'|,;:]+|[\s"'|,;:]+$/g, ""))
    .filter((f) => f.length > 0);
  if (fragments.length === 0) return false;
  let from = 0;
  for (const fragment of fragments) {
    const at = haystack.indexOf(fragment, from);
    if (at < 0) return false;
    from = at + fragment.length;
  }
  return true;
}

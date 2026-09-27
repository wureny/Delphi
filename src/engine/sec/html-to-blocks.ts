/**
 * Minimal, dependency-free HTML → text-block normalizer for SEC exhibits.
 *
 * Runs unchanged in Node and in the Worker runtime (no DOM). The output is a
 * sequence of paragraph and table blocks; tables keep one line per row with
 * cells joined by " | " so the model can cite a row verbatim and validators
 * can re-find the quote in the stored excerpt text.
 */

export type TextBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "table"; rows: string[] };

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "-",
  mdash: "-",
  hellip: "...",
  bull: "•",
  middot: "·",
  reg: "®",
  trade: "™",
  copy: "©",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1]?.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code)) return match;
      const ch = String.fromCodePoint(code);
      // Normalize typographic characters so quotes are stable to re-match.
      if (ch === "’" || ch === "‘") return "'";
      if (ch === "“" || ch === "”") return '"';
      if (ch === "–" || ch === "—") return "-";
      if (ch === " ") return " ";
      return ch;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Collapse whitespace and normalize characters that commonly break quote matching. */
export function normalizeText(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return normalizeText(decodeEntities(html.replace(/<[^>]+>/g, " ")));
}

/** Merge SEC-style split cells: "$" | "76,441" and "(1,234" | ")" and "18" | "%". */
function mergeCells(cells: string[]): string[] {
  const out: string[] = [];
  for (const cell of cells) {
    if (!cell) continue;
    const prev = out.length > 0 ? out[out.length - 1] : undefined;
    if (prev !== undefined && /^[%)]+$/.test(cell)) {
      out[out.length - 1] = prev + cell;
      continue;
    }
    if (prev === "$" || prev === "(" || prev === "$(") {
      out[out.length - 1] = prev + cell;
      continue;
    }
    out.push(cell);
  }
  return out;
}

function tableRows(tableHtml: string): string[] {
  const rows: string[] = [];
  const rowRe = /<tr\b[\s\S]*?<\/tr>/gi;
  for (const rowMatch of tableHtml.match(rowRe) ?? []) {
    const cells: string[] = [];
    const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(rowMatch)) !== null) {
      cells.push(stripTags(cell[1] ?? ""));
    }
    const merged = mergeCells(cells);
    if (merged.length > 0) rows.push(merged.join(" | "));
  }
  return rows;
}

/** Convert an HTML document into ordered paragraph / table blocks. */
export function htmlToBlocks(html: string): TextBlock[] {
  // EDGAR documents may carry an SGML envelope (<DOCUMENT><TYPE>…) before <html>.
  const htmlStart = html.search(/<html[\s>]/i);
  let body = (htmlStart > 0 ? html.slice(htmlStart) : html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ");

  // Pull tables out first so their cell structure survives tag stripping.
  const tables: string[][] = [];
  body = body.replace(/<table[\s\S]*?<\/table>/gi, (table) => {
    tables.push(tableRows(table));
    return `\n\u0000TABLE${tables.length - 1}\u0000\n`;
  });

  const withBreaks = body.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n");
  const blocks: TextBlock[] = [];
  for (const rawLine of withBreaks.split("\n")) {
    const tableMarker = /\u0000TABLE(\d+)\u0000/.exec(rawLine);
    if (tableMarker) {
      const rows = tables[Number(tableMarker[1])] ?? [];
      if (rows.length > 0) blocks.push({ kind: "table", rows });
      continue;
    }
    const text = stripTags(rawLine);
    if (text) blocks.push({ kind: "paragraph", text });
  }
  return blocks;
}

export interface ChunkedBlock {
  kind: "paragraph" | "table";
  text: string;
  /** 1-based index of the source block this chunk came from. */
  blockIndex: number;
}

/**
 * Group blocks into citable chunks. Short heading-like paragraphs are merged
 * into the following paragraph; long tables are split by rows with the first
 * header row repeated so each chunk stays interpretable on its own.
 */
export function chunkBlocks(blocks: TextBlock[], maxChars = 1600): ChunkedBlock[] {
  const out: ChunkedBlock[] = [];
  let pendingHeading: string | null = null;

  blocks.forEach((block, i) => {
    const blockIndex = i + 1;
    if (block.kind === "paragraph") {
      const isHeading = block.text.length < 60 && !/[.:;]$/.test(block.text);
      if (isHeading) {
        pendingHeading = pendingHeading ? `${pendingHeading} ${block.text}` : block.text;
        return;
      }
      const text = pendingHeading ? `${pendingHeading}\n${block.text}` : block.text;
      pendingHeading = null;
      out.push({ kind: "paragraph", text, blockIndex });
      return;
    }

    const header = block.rows[0] ?? "";
    let current: string[] = pendingHeading ? [pendingHeading] : [];
    pendingHeading = null;
    let size = current.join("\n").length;
    for (const row of block.rows) {
      if (size + row.length > maxChars && current.length > 1) {
        out.push({ kind: "table", text: current.join("\n"), blockIndex });
        current = header && row !== header ? [header] : [];
        size = header.length;
      }
      current.push(row);
      size += row.length + 1;
    }
    if (current.length > 0) out.push({ kind: "table", text: current.join("\n"), blockIndex });
  });

  if (pendingHeading) out.push({ kind: "paragraph", text: pendingHeading, blockIndex: blocks.length });
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMarkdown(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return blocks.map(renderBlock).join("");
}

function renderBlock(block: string): string {
  if (/^- /.test(block)) {
    const items = block
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => `<li>${renderInline(line.slice(2).trim())}</li>`)
      .join("");

    return `<ul>${items}</ul>`;
  }

  if (/^1\. /.test(block)) {
    const items = block
      .split("\n")
      .filter((line) => /^\d+\. /.test(line))
      .map((line) => `<li>${renderInline(line.replace(/^\d+\. /, "").trim())}</li>`)
      .join("");

    return `<ol>${items}</ol>`;
  }

  if (block.startsWith("# ")) {
    return `<h4>${renderInline(block.slice(2).trim())}</h4>`;
  }

  const lines = block.split("\n").map((line) => renderInline(line.trim())).join("<br>");
  return `<p>${lines}</p>`;
}

function renderInline(value: string): string {
  let output = escapeHtml(value);

  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return output;
}

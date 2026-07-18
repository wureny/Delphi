import type { DataClassification, FundContextRole, LocalContextArtifact } from "@/domain/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PREVIEW_CHARS = 12_000;
const SUPPORTED_EXTENSIONS = new Set(["csv", "json", "txt", "md", "pdf"]);

export interface LocalImportOptions {
  title?: string;
  contextRole?: FundContextRole;
  classification?: DataClassification;
  asOf?: string;
  now?: string;
}

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return `sha256:${Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push(`[Page ${pageNumber}] ${text}`);
  }
  await loadingTask.destroy();
  return pages.join("\n\n");
}

/**
 * Normalize a user-selected file entirely in the browser. Only the bounded
 * preview and content hash are returned for persistence; raw bytes never
 * enter the Zustand store or any network transport.
 */
export async function parseLocalContextFile(
  file: File,
  options: LocalImportOptions = {},
): Promise<LocalContextArtifact> {
  const extension = extensionOf(file.name);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported file type. Choose CSV, JSON, TXT, Markdown, or PDF.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File exceeds the 5 MB browser-local demo limit.");
  }

  const buffer = await file.arrayBuffer();
  const contentHash = await sha256(buffer);
  const warnings: string[] = [];
  let text: string;

  if (extension === "pdf") {
    text = await extractPdfText(buffer);
    if (!text.trim()) warnings.push("No machine-readable text was found in this PDF.");
  } else {
    text = new TextDecoder().decode(buffer);
    if (extension === "json") {
      try {
        text = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        throw new Error("The selected JSON file is not valid JSON.");
      }
    }
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length > MAX_PREVIEW_CHARS) {
    warnings.push(`Preview truncated to ${MAX_PREVIEW_CHARS.toLocaleString()} characters.`);
  }
  warnings.push("Stored locally as a normalized preview and hash; raw file bytes are not persisted.");

  const createdAt = options.now ?? new Date().toISOString();
  return {
    artifactId: `local_${contentHash.slice(7, 23)}`,
    title: options.title?.trim() || file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    mediaType: file.type || `application/${extension}`,
    sizeBytes: file.size,
    contentHash,
    textPreview: normalized.slice(0, MAX_PREVIEW_CHARS),
    warnings,
    contextRole: options.contextRole ?? "local_reference",
    classification: options.classification ?? "internal",
    asOf: options.asOf ?? createdAt,
    createdAt,
    originKind: "user_provided_local",
    inputUsage: "excluded",
    inputUsageReason: "not_analyzed_in_deterministic_demo",
  };
}

export const LOCAL_IMPORT_LIMIT_BYTES = MAX_FILE_BYTES;
export const LOCAL_IMPORT_ACCEPT = ".csv,.json,.txt,.md,.pdf,text/csv,application/json,text/plain,text/markdown,application/pdf";

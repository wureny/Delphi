import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scenarioDir = path.join(root, "src/fixtures/data/real/msft-fy25q4");
const sourcesDir = path.join(scenarioDir, "sources");
const inventory = JSON.parse(await readFile(path.join(scenarioDir, "source-inventory.json"), "utf8"));
const refresh = process.argv.includes("--refresh");
const errors = [];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const isSha256 = (value) => /^sha256:[a-f0-9]{64}$/.test(value);

const sourceFiles = (await readdir(sourcesDir)).filter((file) => file.endsWith(".json"));
const bundles = await Promise.all(
  sourceFiles.map(async (file) => JSON.parse(await readFile(path.join(sourcesDir, file), "utf8"))),
);
const bundleById = new Map(bundles.map((bundle) => [bundle.sourceDocument.sourceId, bundle]));

for (const entry of inventory.sources) {
  const bundle = bundleById.get(entry.sourceId);
  if (!bundle) {
    errors.push(`${entry.sourceId}: no normalized source bundle`);
    continue;
  }
  const document = bundle.sourceDocument;
  if (document.originKind !== "real_public") errors.push(`${entry.sourceId}: origin must be real_public`);
  if (document.canonicalUri !== entry.canonicalUri) errors.push(`${entry.sourceId}: canonical URI mismatch`);
  if (document.publisherName !== entry.publisher) errors.push(`${entry.sourceId}: publisher mismatch`);
  if (document.contentHash !== `sha256:${entry.expectedRemoteSha256}`) errors.push(`${entry.sourceId}: remote hash mismatch`);
  if (!document.retrievedAt) errors.push(`${entry.sourceId}: retrieval time missing`);
  if (!document.rightsNote || !entry.rightsNote) errors.push(`${entry.sourceId}: rights metadata missing`);
  if (entry.phase === "pre_event" && Date.parse(entry.publishedAt) > Date.parse(inventory.eventCutoff)) {
    errors.push(`${entry.sourceId}: pre-event source was published after the event cutoff`);
  }
  if (bundle.excerpts.length === 0) errors.push(`${entry.sourceId}: no normalized excerpts`);
  for (const excerpt of bundle.excerpts) {
    if (excerpt.sourceId !== entry.sourceId) errors.push(`${excerpt.excerptId}: source reference mismatch`);
    if (!isSha256(excerpt.contentHash)) errors.push(`${excerpt.excerptId}: invalid excerpt hash`);
    if (!excerpt.text.trim()) errors.push(`${excerpt.excerptId}: empty excerpt`);
    if (Object.keys(excerpt.locator).length === 0) errors.push(`${excerpt.excerptId}: locator missing`);
    for (const value of excerpt.numericValues ?? []) {
      if (value.sourceExcerptId !== excerpt.excerptId) errors.push(`${excerpt.excerptId}: numeric source reference mismatch`);
      if (!value.basis.trim()) errors.push(`${excerpt.excerptId}: numeric basis missing`);
    }
  }
}

const publicBundleIds = bundles
  .filter((bundle) => bundle.sourceDocument.originKind === "real_public")
  .map((bundle) => bundle.sourceDocument.sourceId);
for (const sourceId of publicBundleIds) {
  if (!inventory.sources.some((entry) => entry.sourceId === sourceId)) {
    errors.push(`${sourceId}: real-public bundle is absent from source inventory`);
  }
}

const report = {
  inventoryVersion: inventory.inventoryVersion,
  reviewedAt: inventory.reviewedAt,
  mode: refresh ? "remote-refresh" : "offline-contract",
  sourceCount: inventory.sources.length,
  runtimeNetworkAccess: inventory.runtimeNetworkAccess,
  sources: [],
  errors,
};

if (refresh) {
  for (const entry of inventory.sources) {
    try {
      const response = await fetch(entry.canonicalUri, {
        headers: {
          "user-agent": "DelphiSourceVerifier/0.3 source-review@example.invalid",
          accept: "*/*",
        },
        redirect: "follow",
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      const actualSha256 = sha256(bytes);
      const drifted = actualSha256 !== entry.expectedRemoteSha256;
      report.sources.push({
        sourceId: entry.sourceId,
        status: response.status,
        finalUri: response.url,
        expectedSha256: entry.expectedRemoteSha256,
        actualSha256,
        bytes: bytes.length,
        drifted,
      });
      if (!response.ok) errors.push(`${entry.sourceId}: remote status ${response.status}`);
      if (drifted) errors.push(`${entry.sourceId}: public source content drifted`);
    } catch (error) {
      report.sources.push({ sourceId: entry.sourceId, error: error instanceof Error ? error.message : String(error) });
      errors.push(`${entry.sourceId}: remote fetch failed`);
    }
  }
} else {
  report.sources = inventory.sources.map((entry) => ({
    sourceId: entry.sourceId,
    phase: entry.phase,
    expectedSha256: entry.expectedRemoteSha256,
    normalizedExcerptCount: bundleById.get(entry.sourceId)?.excerpts.length ?? 0,
    status: "verified_offline",
  }));
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (errors.length > 0) process.exitCode = 1;

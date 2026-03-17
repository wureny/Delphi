import { FileSystemRuntimeArtifactsStore } from "../src/data-layer/index.ts";

async function main(): Promise<void> {
  const runId = process.argv[2];

  if (!runId) {
    throw new Error("Usage: npm run data:artifacts:read -- <runId>");
  }

  const store = FileSystemRuntimeArtifactsStore.fromEnv();
  const artifacts = await store.readRunArtifacts(runId);

  if (!artifacts) {
    console.log(JSON.stringify({ runId, found: false }, null, 2));
    return;
  }

  console.log(JSON.stringify(
    {
      runId: artifacts.runId,
      found: true,
      bundles: {
        company: summarizeBundle(artifacts.company),
        news: summarizeBundle(artifacts.news),
        market: summarizeBundle(artifacts.market),
        macro: summarizeBundle(artifacts.macro),
      },
    },
    null,
    2,
  ));
}

function summarizeBundle(
  bundle:
    | {
        rawSnapshots: unknown[];
        evidenceCandidates: unknown[];
        degradedReasons: string[];
        cacheStatus: string;
      }
    | undefined,
): Record<string, unknown> | null {
  if (!bundle) {
    return null;
  }

  return {
    rawSnapshotCount: bundle.rawSnapshots.length,
    evidenceCandidateCount: bundle.evidenceCandidates.length,
    degradedReasons: bundle.degradedReasons,
    cacheStatus: bundle.cacheStatus,
  };
}

await main();

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RuntimeDataArtifacts, SnapshotArtifacts } from "./contracts.ts";

type BundleKind = keyof Omit<RuntimeDataArtifacts, "runId">;

export interface PersistedSnapshotArtifacts<TSnapshot = unknown> {
  runId: string;
  bundleKind: BundleKind;
  persistedAt: string;
  bundle: SnapshotArtifacts<TSnapshot>;
}

export interface RuntimeArtifactsStore {
  persistBundle<TSnapshot>(
    runId: string,
    bundleKind: BundleKind,
    bundle: SnapshotArtifacts<TSnapshot>,
  ): Promise<void>;
  readRunArtifacts(runId: string): Promise<RuntimeDataArtifacts | null>;
}

export interface FileSystemRuntimeArtifactsStoreOptions {
  rootDir: string;
}

export class NoopRuntimeArtifactsStore implements RuntimeArtifactsStore {
  async persistBundle<TSnapshot>(
    _runId: string,
    _bundleKind: BundleKind,
    _bundle: SnapshotArtifacts<TSnapshot>,
  ): Promise<void> {
    return Promise.resolve();
  }

  async readRunArtifacts(_runId: string): Promise<RuntimeDataArtifacts | null> {
    return null;
  }
}

export class FileSystemRuntimeArtifactsStore implements RuntimeArtifactsStore {
  private readonly rootDir: string;

  constructor(options: FileSystemRuntimeArtifactsStoreOptions) {
    this.rootDir = options.rootDir;
  }

  static fromEnv(
    env: NodeJS.ProcessEnv = process.env,
  ): FileSystemRuntimeArtifactsStore {
    const rootDir =
      env.DELPHI_DATA_ARTIFACTS_DIR ??
      path.join(process.cwd(), ".delphi", "data-artifacts");

    return new FileSystemRuntimeArtifactsStore({ rootDir });
  }

  async persistBundle<TSnapshot>(
    runId: string,
    bundleKind: BundleKind,
    bundle: SnapshotArtifacts<TSnapshot>,
  ): Promise<void> {
    const runDir = path.join(this.rootDir, sanitizePathSegment(runId));
    await mkdir(runDir, { recursive: true });

    const persisted: PersistedSnapshotArtifacts<TSnapshot> = {
      runId,
      bundleKind,
      persistedAt: new Date().toISOString(),
      bundle,
    };

    await writeFile(
      path.join(runDir, `${bundleKind}.json`),
      `${JSON.stringify(persisted, null, 2)}\n`,
      "utf8",
    );
  }

  async readRunArtifacts(runId: string): Promise<RuntimeDataArtifacts | null> {
    const runDir = path.join(this.rootDir, sanitizePathSegment(runId));
    const result: RuntimeDataArtifacts = { runId };
    let foundAny = false;

    for (const bundleKind of bundleKinds) {
      const filePath = path.join(runDir, `${bundleKind}.json`);

      try {
        const content = await readFile(filePath, "utf8");
        const parsed = JSON.parse(content) as PersistedSnapshotArtifacts;
        assignBundle(result, bundleKind, parsed.bundle);
        foundAny = true;
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    return foundAny ? result : null;
  }
}

const bundleKinds = ["company", "news", "market", "macro"] as const;

function assignBundle(
  artifacts: RuntimeDataArtifacts,
  bundleKind: BundleKind,
  bundle: SnapshotArtifacts<unknown>,
): void {
  const target = artifacts as {
    company?: SnapshotArtifacts<unknown> | undefined;
    news?: SnapshotArtifacts<unknown> | undefined;
    market?: SnapshotArtifacts<unknown> | undefined;
    macro?: SnapshotArtifacts<unknown> | undefined;
  };

  switch (bundleKind) {
    case "company":
      target.company = bundle;
      return;
    case "news":
      target.news = bundle;
      return;
    case "market":
      target.market = bundle;
      return;
    case "macro":
      target.macro = bundle;
      return;
  }
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^\w.-]+/g, "_");
}

function isNotFoundError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

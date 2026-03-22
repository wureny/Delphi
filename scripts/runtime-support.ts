import type { GraphWriter } from "../src/research-graph/graph-writer.ts";
import { NoopGraphWriter } from "../src/research-graph/graph-writer.ts";
import {
  createNeo4jDriverExecutor,
  Neo4jGraphWriter,
  readNeo4jConfigFromEnv,
} from "../src/research-graph/index.ts";
import {
  OpenBBRuntimeDataAdapter,
} from "../src/data-layer/index.ts";
import {
  FixtureRuntimeDataAdapter,
} from "../src/orchestration/fixtures.ts";
import type { AgentExecutorMap } from "../src/orchestration/agent-runtime.ts";
import type {
  CompanySnapshot,
  MacroLiquiditySnapshot,
  MarketSnapshot,
  NewsSnapshot,
  RuntimeDataAdapter,
} from "../src/orchestration/agent-runtime.ts";
import { OpenAIChatCompletionsProvider } from "../src/orchestration/openai-provider.ts";
import { createProviderExecutors } from "../src/orchestration/provider-executors.ts";
import { createFixtureExecutors } from "../src/orchestration/fixtures.ts";
import type {
  GraphPatch,
  GraphWriteContext,
  GraphWriteReceipt,
} from "../src/research-graph/index.ts";

export interface ResolvedRuntimeGraphWriter {
  writer: GraphWriter;
  mode: "noop" | "neo4j";
  close(): Promise<void>;
}

export interface ResolvedRuntimeExecutors {
  executors: AgentExecutorMap;
  mode: "fixture" | "openai";
}

export function resolveRuntimeDataAdapter():
  | FixtureRuntimeDataAdapter
  | OpenBBRuntimeDataAdapter {
  const mode = process.env.RUNTIME_DATA_MODE ?? "fixture";
  const faultConfig = readRuntimeSmokeFaultConfig(process.env);

  if (mode === "openbb") {
    return withRuntimeSmokeFaults(OpenBBRuntimeDataAdapter.fromEnv(), faultConfig);
  }

  return withRuntimeSmokeFaults(FixtureRuntimeDataAdapter.fromEnv(), faultConfig);
}

export function resolveRuntimeGraphWriter(): ResolvedRuntimeGraphWriter {
  const mode = process.env.RUNTIME_GRAPH_MODE ?? "noop";
  const faultConfig = readRuntimeSmokeFaultConfig(process.env);

  if (mode === "neo4j") {
    const executor = createNeo4jDriverExecutor(readNeo4jConfigFromEnv());
    const writer = withRuntimeSmokeFaults(new Neo4jGraphWriter(executor), faultConfig);

    return {
      writer,
      mode: "neo4j",
      async close(): Promise<void> {
        await executor.close();
      },
    };
  }

  return {
    writer: withRuntimeSmokeFaults(new NoopGraphWriter(), faultConfig),
    mode: "noop",
    async close(): Promise<void> {
      return Promise.resolve();
    },
  };
}

export function resolveRuntimeExecutors(): ResolvedRuntimeExecutors {
  const mode = process.env.RUNTIME_EXECUTION_MODE ?? "fixture";

  if (mode === "openai") {
    const provider = OpenAIChatCompletionsProvider.fromEnv();
    return {
      executors: createProviderExecutors(provider),
      mode: "openai",
    };
  }

  return {
    executors: createFixtureExecutors(),
    mode: "fixture",
  };
}

interface RuntimeSmokeFaultConfig {
  failOpenBbRunKeys: Set<string>;
  failGraphWriteRunKeys: Set<string>;
}

class RuntimeSmokeFaultDataAdapter implements RuntimeDataAdapter {
  constructor(
    private readonly adapter: RuntimeDataAdapter,
    private readonly config: RuntimeSmokeFaultConfig,
  ) {}

  async getCompanySnapshot(ticker: string, runId: string): Promise<CompanySnapshot> {
    this.maybeFailOpenBb(runId);
    return this.adapter.getCompanySnapshot(ticker, runId);
  }

  async getNewsSnapshot(ticker: string, runId: string): Promise<NewsSnapshot> {
    this.maybeFailOpenBb(runId);
    return this.adapter.getNewsSnapshot(ticker, runId);
  }

  async getMarketSnapshot(ticker: string, runId: string): Promise<MarketSnapshot> {
    this.maybeFailOpenBb(runId);
    return this.adapter.getMarketSnapshot(ticker, runId);
  }

  async getMacroLiquiditySnapshot(runId: string): Promise<MacroLiquiditySnapshot> {
    this.maybeFailOpenBb(runId);
    return this.adapter.getMacroLiquiditySnapshot(runId);
  }

  private maybeFailOpenBb(runId: string): void {
    const runKey = inferRunKeyFromRunId(runId);

    if (runKey && this.config.failOpenBbRunKeys.has(runKey)) {
      throw new Error(`Smoke injected OpenBB failure for runKey=${runKey}.`);
    }
  }
}

class RuntimeSmokeFaultGraphWriter implements GraphWriter {
  constructor(
    private readonly writer: GraphWriter,
    private readonly config: RuntimeSmokeFaultConfig,
  ) {}

  async write(patch: GraphPatch, context: GraphWriteContext): Promise<GraphWriteReceipt> {
    const runKey = inferRunKeyFromRunId(patch.runId);

    if (runKey && this.config.failGraphWriteRunKeys.has(runKey)) {
      throw new Error(`Smoke injected graph writer failure for runKey=${runKey}.`);
    }

    return this.writer.write(patch, context);
  }
}

function withRuntimeSmokeFaults<T extends RuntimeDataAdapter | GraphWriter>(
  value: T,
  config: RuntimeSmokeFaultConfig,
): T {
  if (value instanceof NoopGraphWriter || value instanceof Neo4jGraphWriter) {
    return new RuntimeSmokeFaultGraphWriter(value, config) as T;
  }

  return new RuntimeSmokeFaultDataAdapter(value as RuntimeDataAdapter, config) as T;
}

function readRuntimeSmokeFaultConfig(
  env: NodeJS.ProcessEnv,
): RuntimeSmokeFaultConfig {
  return {
    failOpenBbRunKeys: readRunKeySet(env.RUNTIME_SMOKE_FAIL_OPENBB_RUN_KEYS),
    failGraphWriteRunKeys: readRunKeySet(env.RUNTIME_SMOKE_FAIL_GRAPH_WRITE_RUN_KEYS),
  };
}

function readRunKeySet(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

function inferRunKeyFromRunId(runId: string): string | null {
  const match = /^run_api_(.+)_[0-9a-f-]{36}$/.exec(runId);
  return match?.[1] ?? null;
}

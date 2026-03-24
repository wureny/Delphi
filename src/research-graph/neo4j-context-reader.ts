import type {
  GraphContextReader,
  GraphContextSnapshot,
} from "../orchestration/agent-runtime.ts";
import type { Neo4jDriverExecutor } from "./neo4j-driver.ts";

export interface Neo4jContextReaderOptions {
  limit?: number;
}

type GraphContextRow = Record<string, unknown> & {
  ref: string;
  nodeType: string;
  scope?: string | null;
  summary?: string | null;
};

export class Neo4jContextReader implements GraphContextReader {
  private readonly executor: Neo4jDriverExecutor;
  private readonly limit: number;

  constructor(executor: Neo4jDriverExecutor, options: Neo4jContextReaderOptions = {}) {
    this.executor = executor;
    this.limit = options.limit ?? 24;
  }

  async getRunContext(runId: string): Promise<GraphContextSnapshot> {
    return this.readContext(
      "run",
      runId,
      "MATCH (n) WHERE n._runId = $identifier RETURN n._ref AS ref, n._nodeType AS nodeType, n._scope AS scope, coalesce(n.summary, n.claim, n.statement, n.label, n.name, n.businessSummary, n.goal, n.userQuestion, n.title, n.capabilityName, n.decisionType, n.sectionKey) AS summary ORDER BY n._nodeType, n._ref LIMIT toInteger($limit)",
    );
  }

  async getCaseContext(caseId: string): Promise<GraphContextSnapshot> {
    return this.readContext(
      "case",
      caseId,
      "MATCH (n) WHERE n._caseId = $identifier RETURN n._ref AS ref, n._nodeType AS nodeType, n._scope AS scope, coalesce(n.summary, n.claim, n.statement, n.label, n.name, n.businessSummary, n.goal, n.userQuestion, n.title, n.capabilityName, n.decisionType, n.sectionKey) AS summary ORDER BY n._nodeType, n._ref LIMIT toInteger($limit)",
    );
  }

  private async readContext(
    scope: "run" | "case",
    identifier: string,
    cypher: string,
  ): Promise<GraphContextSnapshot> {
    const rows = await this.executor.query<GraphContextRow>(cypher, {
      identifier,
      limit: this.limit,
    });

    if (rows.length === 0) {
      return {
        summary: `No ${scope} graph context available for ${identifier}.`,
        refs: [],
      };
    }

    const refs = unique(rows.map((row) => row.ref));
    const counts = countBy(rows, (row) => row.nodeType);
    const preview = rows
      .slice(0, Math.min(rows.length, 8))
      .map((row) => {
        const summary = row.summary?.trim();
        const scopeLabel = row.scope ? ` [${row.scope}]` : "";

        return summary
          ? `- ${row.nodeType}${scopeLabel} ${row.ref}: ${summary}`
          : `- ${row.nodeType}${scopeLabel} ${row.ref}`;
      });

    return {
      summary: [
        `${scope} graph context for ${identifier}: ${rows.length} node(s).`,
        `Types: ${formatCounts(counts)}`,
        ...preview,
      ].join("\n"),
      refs,
    };
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function countBy<T>(
  values: readonly T[],
  getKey: (value: T) => string,
): Array<[string, number]> {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = getKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()];
}

function formatCounts(entries: readonly [string, number][]): string {
  return entries.map(([key, value]) => `${key}=${value}`).join(", ");
}

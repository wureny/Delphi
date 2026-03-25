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
  asOf?: string | null;
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

  async getPriorJudgments(caseId: string): Promise<GraphContextSnapshot> {
    const rows = await this.executor.query<GraphContextRow>(
      "MATCH (n:Judgment) WHERE n._caseId = $identifier RETURN n._ref AS ref, n._nodeType AS nodeType, n._scope AS scope, coalesce(n.summary, n.stance, n.confidenceBand) AS summary, n.asOf AS asOf ORDER BY coalesce(n.asOf, '') DESC, n._ref LIMIT toInteger($limit)",
      {
        identifier: caseId,
        limit: this.limit,
      },
    );

    if (rows.length === 0) {
      return {
        summary: `No prior judgments recorded for case ${caseId}.`,
        refs: [],
      };
    }

    return {
      summary: [
        `Prior judgments for ${caseId}: ${rows.length} node(s).`,
        ...rows.slice(0, Math.min(rows.length, 6)).map((row) => {
          const asOf = row.asOf ? ` @ ${row.asOf}` : "";
          const summary = row.summary?.trim();
          return summary
            ? `- Judgment ${row.ref}${asOf}: ${summary}`
            : `- Judgment ${row.ref}${asOf}`;
        }),
      ].join("\n"),
      refs: unique(rows.map((row) => row.ref)),
    };
  }

  async getContradictions(caseId: string, claim: string): Promise<GraphContextSnapshot> {
    const rows = await this.executor.query<GraphContextRow>(
      "MATCH (t:Thesis)-[:CHALLENGED_BY]->(e:Evidence) WHERE t._caseId = $identifier RETURN e._ref AS ref, e._nodeType AS nodeType, e._scope AS scope, coalesce(e.summary, e.sourceRef, e.sourceType) AS summary ORDER BY coalesce(e.observedAt, '') DESC, e._ref LIMIT toInteger($limit)",
      {
        identifier: caseId,
        limit: this.limit,
      },
    );

    if (rows.length === 0) {
      return {
        summary: `No contradiction evidence recorded for case ${caseId}.`,
        refs: [],
      };
    }

    return {
      summary: [
        `Contradiction scan for case ${caseId} against: ${claim}`,
        ...rows.slice(0, Math.min(rows.length, 6)).map((row) => {
          const summary = row.summary?.trim();
          return summary
            ? `- Evidence ${row.ref}: ${summary}`
            : `- Evidence ${row.ref}`;
        }),
      ].join("\n"),
      refs: unique(rows.map((row) => row.ref)),
    };
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

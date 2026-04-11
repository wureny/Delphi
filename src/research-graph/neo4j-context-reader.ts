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
    // Filter by caseId, order by asOf descending, return most recent 3
    const rows = await this.executor.query<GraphContextRow>(
      `MATCH (n:Judgment) WHERE n._caseId = $identifier
       RETURN n._ref AS ref, n._nodeType AS nodeType, n._scope AS scope,
              coalesce(n.summary, n.stance, n.confidenceBand) AS summary,
              n.asOf AS asOf,
              n.stance AS stance,
              n.confidenceBand AS confidenceBand
       ORDER BY coalesce(n.asOf, '') DESC, n._ref
       LIMIT 3`,
      {
        identifier: caseId,
      },
    );

    if (rows.length === 0) {
      return {
        summary: `No prior judgments recorded for case ${caseId}. This is the first analysis.`,
        refs: [],
      };
    }

    return {
      summary: [
        `Prior judgments for ${caseId}: ${rows.length} judgment(s) on record.`,
        ...rows.map((row) => {
          const asOf = row.asOf ? ` @ ${row.asOf}` : "";
          const stance = (row as Record<string, unknown>).stance ?? "";
          const band = (row as Record<string, unknown>).confidenceBand ?? "";
          const detail = [stance, band].filter(Boolean).join(", ");
          const summary = row.summary?.trim();
          return summary
            ? `- Judgment ${row.ref}${asOf} [${detail}]: ${summary}`
            : `- Judgment ${row.ref}${asOf}${detail ? ` [${detail}]` : ""}`;
        }),
      ].join("\n"),
      refs: unique(rows.map((row) => row.ref)),
    };
  }

  async getContradictions(caseId: string, claim: string): Promise<GraphContextSnapshot> {
    // Extract keywords from the claim for more targeted matching
    const keywords = extractKeywords(claim);

    // If we have keywords, do a targeted search; otherwise fall back to all challenges
    const cypher = keywords.length > 0
      ? `MATCH (t:Thesis)-[:CHALLENGED_BY]->(e:Evidence)
         WHERE t._caseId = $identifier
         AND any(kw IN $keywords WHERE
           toLower(coalesce(e.summary, '')) CONTAINS toLower(kw) OR
           toLower(coalesce(t.summary, '')) CONTAINS toLower(kw)
         )
         RETURN e._ref AS ref, e._nodeType AS nodeType, e._scope AS scope,
                coalesce(e.summary, e.sourceRef, e.sourceType) AS summary
         ORDER BY coalesce(e.observedAt, '') DESC, e._ref
         LIMIT toInteger($limit)`
      : `MATCH (t:Thesis)-[:CHALLENGED_BY]->(e:Evidence)
         WHERE t._caseId = $identifier
         RETURN e._ref AS ref, e._nodeType AS nodeType, e._scope AS scope,
                coalesce(e.summary, e.sourceRef, e.sourceType) AS summary
         ORDER BY coalesce(e.observedAt, '') DESC, e._ref
         LIMIT toInteger($limit)`;

    const rows = await this.executor.query<GraphContextRow>(cypher, {
      identifier: caseId,
      keywords,
      limit: this.limit,
    });

    if (rows.length === 0) {
      return {
        summary: `No contradiction evidence recorded for case ${caseId}.`,
        refs: [],
      };
    }

    return {
      summary: [
        `Contradiction scan for case ${caseId} against: "${claim}"`,
        `Found ${rows.length} challenging evidence node(s):`,
        ...rows.slice(0, 6).map((row) => {
          const summary = row.summary?.trim();
          return summary
            ? `- Evidence ${row.ref}: ${summary}`
            : `- Evidence ${row.ref}`;
        }),
      ].join("\n"),
      refs: unique(rows.map((row) => row.ref)),
    };
  }

  async getThesisEvolution(caseId: string): Promise<GraphContextSnapshot> {
    // Return the thesis change chain for this case, ordered by time
    const rows = await this.executor.query<GraphContextRow & { stance?: string | null; runId?: string | null }>(
      `MATCH (t:Thesis)
       WHERE t._caseId = $identifier
       OPTIONAL MATCH (t)-[:SUPPORTED_BY]->(e:Evidence)
       WITH t, count(e) AS evidenceCount
       RETURN t._ref AS ref, t._nodeType AS nodeType, t._scope AS scope,
              coalesce(t.summary, t.stance) AS summary,
              t.stance AS stance,
              t._runId AS runId,
              t.lastUpdatedAt AS asOf,
              evidenceCount
       ORDER BY coalesce(t.lastUpdatedAt, '') DESC, t._ref
       LIMIT toInteger($limit)`,
      {
        identifier: caseId,
        limit: this.limit,
      },
    );

    if (rows.length === 0) {
      return {
        summary: `No thesis history for case ${caseId}. This is the first thesis analysis.`,
        refs: [],
      };
    }

    return {
      summary: [
        `Thesis evolution for ${caseId}: ${rows.length} thesis version(s).`,
        ...rows.map((row) => {
          const asOf = row.asOf ? ` @ ${row.asOf}` : "";
          const stance = row.stance ? ` [${row.stance}]` : "";
          const evCount = (row as Record<string, unknown>).evidenceCount;
          const summary = row.summary?.trim();
          return summary
            ? `- Thesis ${row.ref}${asOf}${stance} (${evCount} evidence): ${summary}`
            : `- Thesis ${row.ref}${asOf}${stance}`;
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

/**
 * Extract meaningful keywords from a claim string for contradiction matching.
 * Filters out common stop words and very short tokens.
 */
function extractKeywords(claim: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "and", "or", "but", "if",
    "then", "than", "that", "this", "these", "those", "it", "its", "in",
    "on", "at", "to", "for", "of", "with", "by", "from", "as", "into",
    "not", "no", "nor", "so", "yet", "both", "each", "all", "any",
    "more", "most", "other", "some", "such", "only", "very", "just",
  ]);

  return claim
    .split(/[\s|,;:.!?()]+/)
    .map((token) => token.toLowerCase().trim())
    .filter((token) => token.length > 2 && !stopWords.has(token))
    .slice(0, 8);
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

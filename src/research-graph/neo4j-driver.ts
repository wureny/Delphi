import neo4j, { type Driver, type SessionConfig } from "neo4j-driver";
import type { Neo4jQueryExecutor, Neo4jStatement } from "./neo4j-adapter.ts";

export interface Neo4jConnectionConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export interface Neo4jDriverExecutorOptions {
  database?: string;
}

export class Neo4jDriverExecutor implements Neo4jQueryExecutor {
  private readonly driver: Driver;
  private readonly options: Neo4jDriverExecutorOptions;

  constructor(driver: Driver, options: Neo4jDriverExecutorOptions = {}) {
    this.driver = driver;
    this.options = options;
  }

  async execute(statements: readonly Neo4jStatement[]): Promise<void> {
    if (statements.length === 0) {
      return;
    }

    const session = this.driver.session(buildSessionConfig(this.options.database));
    const transaction = session.beginTransaction();

    try {
      for (const statement of statements) {
        await transaction.run(statement.cypher, statement.params);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      await session.close();
    }
  }

  async verifyConnectivity(): Promise<void> {
    await this.driver.verifyConnectivity();
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    cypher: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const session = this.driver.session(buildSessionConfig(this.options.database));

    try {
      const result = await session.run(cypher, params);
      return result.records.map((record) =>
        normalizeNeo4jValue(record.toObject()) as T,
      );
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}

export function createNeo4jDriverExecutor(
  config: Neo4jConnectionConfig,
): Neo4jDriverExecutor {
  const driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.username, config.password),
  );

  return new Neo4jDriverExecutor(
    driver,
    config.database ? { database: config.database } : {},
  );
}

export function readNeo4jConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Neo4jConnectionConfig {
  const uri = env.NEO4J_URI;
  const username = env.NEO4J_USERNAME;
  const password = env.NEO4J_PASSWORD;
  const database = env.NEO4J_DATABASE;

  if (!uri) {
    throw new Error("Missing NEO4J_URI.");
  }

  if (!username) {
    throw new Error("Missing NEO4J_USERNAME.");
  }

  if (!password) {
    throw new Error("Missing NEO4J_PASSWORD.");
  }

  return {
    uri,
    username,
    password,
    ...(database ? { database } : {}),
  };
}

function buildSessionConfig(database?: string): SessionConfig | undefined {
  if (!database) {
    return undefined;
  }

  return { database };
}

function normalizeNeo4jValue(value: unknown): unknown {
  if (neo4j.isInt(value)) {
    return value.inSafeRange() ? value.toNumber() : value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeNeo4jValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeNeo4jValue(nestedValue),
      ]),
    );
  }

  return value;
}

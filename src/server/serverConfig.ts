export type ServerRepositoryMode = "fixture";
export type ServerFinancialDataProviderMode = "mock";

export interface ServerConfig {
  repositoryMode: ServerRepositoryMode;
  financialDataProviderMode: ServerFinancialDataProviderMode;
}

export interface ServerConfigInput {
  repositoryMode?: string;
  financialDataProviderMode?: string;
}

export const defaultServerConfig: ServerConfig = {
  repositoryMode: "fixture",
  financialDataProviderMode: "mock",
};

export class ServerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerConfigurationError";
  }
}

export function resolveServerConfig(input: ServerConfigInput = {}): ServerConfig {
  const repositoryMode = input.repositoryMode ?? defaultServerConfig.repositoryMode;
  const financialDataProviderMode =
    input.financialDataProviderMode ?? defaultServerConfig.financialDataProviderMode;

  if (repositoryMode !== "fixture") {
    throw new ServerConfigurationError("Unsupported workspace repository mode.");
  }
  if (financialDataProviderMode !== "mock") {
    throw new ServerConfigurationError("Unsupported financial-data provider mode.");
  }

  return {
    repositoryMode,
    financialDataProviderMode,
  };
}

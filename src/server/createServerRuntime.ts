import { MockFinancialDataProvider } from "../data/mockFinancialDataProvider";
import { defaultMetricThresholds } from "../data/providerRules";
import type { FinancialDataProvider, MetricThreshold } from "../domain/financialData";
import type { WorkspaceData } from "../domain/types";
import { FixtureWorkspaceRepository } from "../repositories/fixtureWorkspaceRepository";
import type { WorkspaceRepository } from "../repositories/workspaceRepository";
import { ServerWorkspaceApiRuntime } from "../api/serverWorkspaceApiRuntime";
import type { ServerConfig } from "./serverConfig";

export interface ServerRuntimeOverrides {
  repository?: WorkspaceRepository;
  financialDataProvider?: FinancialDataProvider;
  metricThresholds?: MetricThreshold[];
  workspaceSeed?: WorkspaceData;
}

export function createServerRuntime(
  config: ServerConfig,
  overrides: ServerRuntimeOverrides = {},
): ServerWorkspaceApiRuntime {
  const repository = overrides.repository ?? createRepository(config, overrides.workspaceSeed);
  const provider = overrides.financialDataProvider ?? createFinancialDataProvider(config);
  const thresholds = overrides.metricThresholds ?? defaultMetricThresholds;

  return new ServerWorkspaceApiRuntime(repository, provider, thresholds);
}

function createRepository(config: ServerConfig, workspaceSeed?: WorkspaceData): WorkspaceRepository {
  switch (config.repositoryMode) {
    case "fixture":
      return new FixtureWorkspaceRepository(workspaceSeed);
  }
}

function createFinancialDataProvider(config: ServerConfig): FinancialDataProvider {
  switch (config.financialDataProviderMode) {
    case "mock":
      return new MockFinancialDataProvider();
  }
}

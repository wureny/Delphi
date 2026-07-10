import { MockFinancialDataProvider } from "../data/mockFinancialDataProvider";
import { defaultMetricThresholds } from "../data/providerRules";
import { FixtureWorkspaceRepository } from "../repositories/fixtureWorkspaceRepository";
import { ServerWorkspaceApiRuntime } from "./serverWorkspaceApiRuntime";

export class FixtureWorkspaceApiRuntime extends ServerWorkspaceApiRuntime {
  constructor(repository = new FixtureWorkspaceRepository()) {
    super(repository, new MockFinancialDataProvider(), defaultMetricThresholds);
  }
}

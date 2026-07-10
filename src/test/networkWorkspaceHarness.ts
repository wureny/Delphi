import { createFetchWorkspaceHttpTransport } from "../api/fetchWorkspaceHttpTransport";
import { HttpWorkspaceApiClient } from "../api/workspaceHttpApi";
import { createServerComposition } from "../server/createServerComposition";
import { resolveNodeServerConfig } from "../server/nodeServerConfig";
import type { NodeServerConfig } from "../server/nodeServerConfig";
import { listenNodeWorkspaceServer } from "../server/nodeWorkspaceServer";

export async function startNetworkWorkspaceHarness(overrides: Partial<NodeServerConfig> = {}) {
  const baseConfig = resolveNodeServerConfig();
  const config: NodeServerConfig = {
    ...baseConfig,
    ...overrides,
    composition: overrides.composition ?? baseConfig.composition,
  };
  const composition = createServerComposition(config.composition);
  const running = await listenNodeWorkspaceServer(composition.handler, config, 0);
  const client = new HttpWorkspaceApiClient(
    createFetchWorkspaceHttpTransport({ baseUrl: running.url }),
  );

  return { client, config, running };
}

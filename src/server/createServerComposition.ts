import { createWorkspaceHttpHandler } from "../api/workspaceHttpApi";
import type { WorkspaceHttpHandler } from "../api/workspaceHttpApi";
import type { WorkspaceApiRuntime } from "../api/workspaceApiTypes";
import { createServerRuntime } from "./createServerRuntime";
import { resolveServerConfig } from "./serverConfig";
import type { ServerConfig, ServerConfigInput } from "./serverConfig";

export interface ServerComposition {
  config: ServerConfig;
  runtime: WorkspaceApiRuntime;
  handler: WorkspaceHttpHandler;
}

export function createServerComposition(input: ServerConfigInput = {}): ServerComposition {
  const config = resolveServerConfig(input);
  const runtime = createServerRuntime(config);

  return {
    config,
    runtime,
    handler: createWorkspaceHttpHandler(runtime),
  };
}

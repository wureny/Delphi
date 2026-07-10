import { createServerComposition } from "./createServerComposition";
import { NodeServerConfigurationError, resolveNodeServerConfig } from "./nodeServerConfig";
import { listenNodeWorkspaceServer } from "./nodeWorkspaceServer";

async function start(): Promise<void> {
  const config = resolveNodeServerConfig(process.env);
  const composition = createServerComposition({
    repositoryMode: config.composition.repositoryMode,
    financialDataProviderMode: config.composition.financialDataProviderMode,
  });
  const running = await listenNodeWorkspaceServer(composition.handler, config);
  console.info(`Delphi server listening on ${running.url}`);

  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    void running.close().catch(() => {
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void start().catch((error: unknown) => {
  const message =
    error instanceof NodeServerConfigurationError
      ? error.message
      : "Delphi server failed to start without exposing implementation details.";
  console.error(message);
  process.exitCode = 1;
});

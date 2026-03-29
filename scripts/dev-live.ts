import { spawn } from "node:child_process";

const tsxLoader = "./node_modules/tsx/dist/loader.mjs";
const suppressWarnings = "./node_modules/tsx/dist/suppress-warnings.cjs";
const tsxImportTarget = "tsx";

const [major, minor] = process.versions.node
  .split(".")
  .slice(0, 2)
  .map((part) => Number.parseInt(part, 10));
const supportsImport =
  major > 20 ||
  (major === 20 && minor >= 6) ||
  (major === 18 && minor >= 19);
const runtimeArgs = supportsImport
  ? ["--require", suppressWarnings, "--import", tsxImportTarget, "./scripts/serve-runtime-api.ts"]
  : ["--require", suppressWarnings, "--loader", tsxLoader, "./scripts/serve-runtime-api.ts"];
const frontendArgs = supportsImport
  ? ["--require", suppressWarnings, "--import", tsxImportTarget, "./scripts/serve-frontend.ts"]
  : ["--require", suppressWarnings, "--loader", tsxLoader, "./scripts/serve-frontend.ts"];

const processes = [
  spawn(
    "node",
    runtimeArgs,
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    },
  ),
  spawn(
    "node",
    frontendArgs,
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    },
  ),
];

const frontendHost = process.env.FRONTEND_HOST ?? "127.0.0.1";
const frontendPort = process.env.FRONTEND_PORT ?? "4173";
const runtimeHost = process.env.RUNTIME_API_HOST ?? "127.0.0.1";
const runtimePort = process.env.RUNTIME_API_PORT ?? "8787";
const runKey = process.env.RUNTIME_RUN_KEY;
const liveUrl = new URL(
  `http://${frontendHost}:${frontendPort}/?source=sse&runtime=http://${runtimeHost}:${runtimePort}`,
);

if (runKey) {
  liveUrl.searchParams.set("run", runKey);
}

console.log("");
console.log("Live frontend URL");
console.log(liveUrl.toString());
console.log("");

let exiting = false;

const shutdown = (signal: NodeJS.Signals): void => {
  if (exiting) {
    return;
  }

  exiting = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

for (const child of processes) {
  child.on("exit", (code) => {
    if (exiting) {
      return;
    }

    exiting = true;

    for (const other of processes) {
      if (other !== child && !other.killed) {
        other.kill("SIGTERM");
      }
    }

    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

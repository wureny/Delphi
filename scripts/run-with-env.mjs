import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const [, , entry, ...args] = process.argv;

if (!entry) {
  console.error("Usage: node ./scripts/run-with-env.mjs <entry> [...args]");
  process.exit(1);
}

const env = { ...process.env };
const envFile = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envFile)) {
  const source = fs.readFileSync(envFile, "utf8");

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();

    if (!key || key in env) {
      continue;
    }

    let value = normalized.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
}

const tsxLoader = path.resolve(
  process.cwd(),
  "node_modules",
  "tsx",
  "dist",
  "loader.mjs",
);
const suppressWarnings = path.resolve(
  process.cwd(),
  "node_modules",
  "tsx",
  "dist",
  "suppress-warnings.cjs",
);
const tsxImportTarget = "tsx";

const [major, minor] = process.versions.node
  .split(".")
  .slice(0, 2)
  .map((part) => Number.parseInt(part, 10));
const supportsImport =
  major > 20 ||
  (major === 20 && minor >= 6) ||
  (major === 18 && minor >= 19);
const nodeArgs = supportsImport
  ? ["--require", suppressWarnings, "--import", tsxImportTarget, entry, ...args]
  : ["--require", suppressWarnings, "--loader", tsxLoader, entry, ...args];

const child = spawn(process.execPath, nodeArgs, {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

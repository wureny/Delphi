import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const runtimeApiBaseUrl = process.env.NEXT_PUBLIC_RUNTIME_API_BASE_URL ?? "";
const outputPath = resolve(process.cwd(), "frontend/runtime-config.js");

const content = `window.__DELHI_FRONTEND_CONFIG__ = Object.freeze({
  runtimeApiBaseUrl: ${JSON.stringify(runtimeApiBaseUrl)},
});
`;

await writeFile(outputPath, content, "utf8");
console.log(
  runtimeApiBaseUrl
    ? `Wrote frontend runtime config with NEXT_PUBLIC_RUNTIME_API_BASE_URL=${runtimeApiBaseUrl}`
    : "Wrote frontend runtime config without NEXT_PUBLIC_RUNTIME_API_BASE_URL",
);

import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    ".wrangler/**",
    "node_modules/**",
    "Delphi_Prototype_and_EFL_Pack_v0_2/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  nextPlugin.configs["core-web-vitals"],
]);

import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root: a stray lockfile in a parent directory must not
  // change module resolution for this repository.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;

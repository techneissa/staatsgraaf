import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Next 16 writes its own AGENTS.md and CLAUDE.md into web/ on dev. Those
  // agent files are not part of the published repository (docs/adr/0023), so
  // do not generate them.
  agentRules: false,
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

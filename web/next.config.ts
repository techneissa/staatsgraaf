import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Next 16 writes its own AGENTS.md and CLAUDE.md into web/ on dev. Do not
  // generate them.
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

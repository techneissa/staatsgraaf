import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Next 16 writes its own AGENTS.md and CLAUDE.md into web/ on dev. The
  // operating law of this repo is the AGENTS.md at the root (see its routing
  // table); a second generated one next to it would contradict it.
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

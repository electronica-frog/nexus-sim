import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Keep SSE connections alive for long LLM calls
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    // Warm up edge routes on startup
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;

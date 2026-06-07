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
    // Single CPU — no worker threads (reduces memory ~50MB)
    workerThreads: false,
    cpus: 1,
    // Optimize package imports to reduce bundle
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      'recharts',
    ],
  },
};

export default nextConfig;

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
  // Reduce memory pressure from static generation
  output: 'standalone',
  // Limit concurrent SSR requests to prevent memory spikes
  // (implicit: Next.js 16 handles this natively with cpus: 1)
};

export default nextConfig;

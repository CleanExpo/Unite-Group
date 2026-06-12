import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /api/run route reads the engine prompt from skills/ at runtime;
  // make sure Vercel bundles it with the serverless function.
  outputFileTracingIncludes: {
    "/api/run": ["./skills/fable-engine/**"],
  },
};

export default nextConfig;

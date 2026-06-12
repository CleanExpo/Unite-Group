import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /api/run route reads the engine prompt from skills/ at runtime;
  // make sure Vercel bundles it with the serverless function.
  outputFileTracingIncludes: {
    "/api/run": ["./skills/fable-engine/**"],
    // /api/board reads advisor profiles from knowledge/board/ at runtime.
    "/api/board": ["./knowledge/board/**"],
  },
};

export default nextConfig;

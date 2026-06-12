import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /api/run route reads the engine prompt from skills/ at runtime;
  // make sure Vercel bundles it with the serverless function.
  outputFileTracingIncludes: {
    "/api/run": ["./skills/fable-engine/**"],
    // /api/board and /api/health read advisor profiles from knowledge/board/
    // at runtime.
    "/api/board": ["./knowledge/board/**"],
    "/api/health": ["./knowledge/board/**"],
  },
};

export default nextConfig;

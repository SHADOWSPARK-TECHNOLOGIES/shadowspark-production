import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.140.170.127", "localhost:3000"],
  // CORS is handled per-route via src/lib/cors.ts (withCors/handleCorsPreflight)
  // Do NOT add static Access-Control-Allow-Origin here — it conflicts with dynamic origin matching
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["undici", "bullmq", "ioredis"],
};

export default nextConfig;

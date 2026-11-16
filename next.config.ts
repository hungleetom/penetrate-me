import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  allowedDevOrigins:
    process.env.SHANNON_DOCKER_ACCESS === "1" ? ["172.17.0.1"] : [],
  serverExternalPackages: ["@prisma/client", "prisma", "node:sqlite"],
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "127.0.0.1:3000"] },
  },
};
export default config;

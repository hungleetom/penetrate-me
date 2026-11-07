import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["@prisma/client", "prisma", "node:sqlite"],
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "127.0.0.1:3000"] },
  },
};
export default config;

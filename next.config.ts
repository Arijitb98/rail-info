import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize Node.js native modules that shouldn't be bundled
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;

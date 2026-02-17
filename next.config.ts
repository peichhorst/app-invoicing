import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: To run without Turbopack, use: npm run dev (without --turbo flag)
  // The react compiler is causing turbopack to be used
  reactCompiler: false, // Disables React Compiler which forces Turbopack
  serverExternalPackages: [
    "@libsql/client",
    "@prisma/adapter-libsql",
    "@prisma/client",
    "@prisma/client-runtime-utils",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

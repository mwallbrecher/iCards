import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only used by `next dev`; production builds and Vercel deploys ignore this.
  allowedDevOrigins: ["localhost", "127.0.0.1", "10.137.198.41"],
  experimental: {
    serverActions: {
      // Production deploys: Vercel sets the Host header automatically, so
      // allowedOrigins is consulted only when the deployment URL differs from
      // the request URL. Listing the production domain explicitly is safe.
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        "10.137.198.41:3000", // dev LAN
        "icards.wallbrecher.io", // production
        "*.vercel.app", // preview deployments
      ],
    },
  },
};

export default nextConfig;

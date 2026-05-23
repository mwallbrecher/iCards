import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

function getLocalIPv4Hosts(): string[] {
  const hosts = new Set<string>();

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.internal || String(address.family) !== "IPv4") {
        continue;
      }

      hosts.add(address.address);
    }
  }

  return [...hosts];
}

const devHosts = ["localhost", "127.0.0.1", ...getLocalIPv4Hosts()];
const devPorts = ["3000", "3001"];

const nextConfig: NextConfig = {
  allowedDevOrigins: devHosts,
  experimental: {
    serverActions: {
      allowedOrigins: devHosts.flatMap((host) =>
        devPorts.map((port) => `${host}:${port}`),
      ),
    },
  },
};

export default nextConfig;

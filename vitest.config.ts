import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    root: "tests",
    globals: true,
    environment: "node",
    env: loadEnv(mode, process.cwd(), ""),
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname,
    },
  },
}));

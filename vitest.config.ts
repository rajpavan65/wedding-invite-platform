import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // Single-run by default; CI/agent friendly (no watch mode).
    watch: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});

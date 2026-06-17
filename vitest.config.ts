import { defineConfig } from "vitest/config";
import path from "path";

// Test runner config. Node environment (the suite currently covers pure,
// server-side helpers; add jsdom later if/when component tests arrive). The
// alias mirrors tsconfig's "@/* -> ./src/*" so tests import modules the same
// way app code does.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

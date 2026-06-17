import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone operational tooling deployed OUTSIDE the Next app (the FFmpeg
    // render server on DigitalOcean/Render, plus one-off CLI scripts). Not part
    // of the app build or test gate, so the app's lint gate does not cover them.
    "scripts/**",
    "render-service/**",
  ]),
]);

export default eslintConfig;

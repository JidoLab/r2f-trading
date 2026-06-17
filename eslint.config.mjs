import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Admin dashboards are internal, auth-gated, and not indexed, so image
  // optimization gives no real benefit and the images are often dynamic /
  // user-managed. Don't force next/image there.
  {
    files: ["src/app/admin/**"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
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

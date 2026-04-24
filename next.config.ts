import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import fs from "fs";
import path from "path";

/**
 * Load blog-post redirects from data/post-redirects.json at build time.
 *
 * The file is the source of truth — the admin delete endpoint appends to it
 * whenever a post is deleted with a ?replacedBy=<slug> target. Vercel
 * rebuilds on every commit, so the new redirects go live automatically.
 *
 * Shape of each entry:
 *   { from: "old-slug", to: "new-slug", deletedAt: ISO, reason?: string }
 *
 * Both slugs are expected WITHOUT the /trading-insights/ prefix — we add it here.
 */
function loadPostRedirects() {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "data/post-redirects.json"), "utf-8");
    const entries = JSON.parse(raw) as { from: string; to: string; deletedAt?: string; reason?: string }[];
    return entries.map((e) => ({
      source: `/trading-insights/${e.from}`,
      destination: `/trading-insights/${e.to}`,
      permanent: true,
    }));
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  async redirects() {
    return loadPostRedirects();
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);

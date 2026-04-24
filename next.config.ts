import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  // 301 redirects for blog posts deleted during the 2026-04-16 duplicate
  // cleanup (commit 0fc377d). Google indexed these URLs before we removed
  // them, so they show up as 404s in GSC. Each redirect preserves link
  // equity by pointing at the "kept" stronger version of the same topic.
  async redirects() {
    return [
      {
        source: "/trading-insights/2026-04-14-ict-mitigation-block-vs-order-block-which-works-better",
        destination: "/trading-insights/2026-04-12-ict-mitigation-block-vs-order-block-key-differences",
        permanent: true,
      },
      {
        source: "/trading-insights/2026-04-14-5-signs-you-re-revenge-trading-and-how-to-stop",
        destination: "/trading-insights/2026-04-12-5-signs-you-re-revenge-trading-and-how-to-stop",
        permanent: true,
      },
      {
        source: "/trading-insights/2026-04-15-retail-sales-week-how-smart-money-fakes-direction",
        destination: "/trading-insights/2026-04-15-retail-sales-week-how-smart-money-trades-usd",
        permanent: true,
      },
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);

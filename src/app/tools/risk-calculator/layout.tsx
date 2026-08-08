import type { Metadata } from "next";
import { seoTitle, seoDescription } from "@/lib/seo";

export const metadata: Metadata = {
  // Title leads with the exact query "Risk Reward Ratio Calculator" — current
  // GSC ranking is position 73-75 because the page never said that exact phrase.
  // seoTitle() drops the brand suffix when it would push past Google's ~60 char
  // display limit, so the descriptive part is never truncated in the SERP.
  title: seoTitle("Risk Reward Ratio Calculator: Free Position Size Tool"),
  description: seoDescription(
    "Free risk reward ratio calculator for forex, futures, and prop firm traders. Enter your entry, stop, and target to get exact position size, R:R, and dollar risk."
  ),
  keywords: [
    "risk reward ratio calculator",
    "risk to reward ratio calculator",
    "risk reward calculator",
    "position size calculator",
    "ICT trading calculator",
    "forex lot size calculator",
    "funded account risk management",
  ],
  alternates: { canonical: "/tools/risk-calculator" },
  openGraph: {
    title: "Risk Reward Ratio Calculator | R2F Trading",
    description:
      "Enter entry, stop, and target to get exact position size, R:R, and dollar risk. The free tool ICT and funded-account traders run before every trade.",
    url: "https://www.r2ftrading.com/tools/risk-calculator",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

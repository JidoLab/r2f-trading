import type { Metadata } from "next";

export const metadata: Metadata = {
  // Title leads with the exact query "Risk Reward Ratio Calculator" — current
  // GSC ranking is position 73-75 because the page never said that exact phrase.
  title: "Risk Reward Ratio Calculator — Free Position Size Tool for ICT Traders",
  description: "Free risk reward ratio calculator for forex, futures, and prop firm traders. Type your entry, stop, and target — get exact position size, R:R, and dollar risk in one click.",
  keywords: [
    "risk reward ratio calculator",
    "risk to reward ratio calculator",
    "risk reward calculator",
    "position size calculator",
    "ICT trading calculator",
    "forex lot size calculator",
    "funded account risk management",
  ],
  openGraph: {
    title: "Risk Reward Ratio Calculator | R2F Trading",
    description: "Type entry, stop, and target — get exact position size, R:R, and dollar risk. Free tool ICT and funded-account traders use before every trade.",
    url: "https://www.r2ftrading.com/tools/risk-calculator",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

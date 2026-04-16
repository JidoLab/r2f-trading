import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Risk/Reward Calculator | R2F Trading",
  description: "Free position size calculator for ICT traders. Calculate exact risk amount, lot size, and reward-to-risk ratio before every trade. Protect your funded account.",
  keywords: ["position size calculator", "risk reward calculator", "ICT trading calculator", "forex lot size calculator", "funded account risk management"],
  openGraph: {
    title: "Trading Risk/Reward Calculator | R2F Trading",
    description: "Calculate your exact position size, risk amount, and R:R ratio. The same tool professional ICT traders use.",
    url: "https://www.r2ftrading.com/tools/risk-calculator",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

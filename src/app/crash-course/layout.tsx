import type { Metadata } from "next";
import { seoTitle, seoDescription } from "@/lib/seo";

// The page itself is a client component, so its metadata lives here. Without
// this the route inherited the homepage title and description verbatim, which
// made it a duplicate of "/" in the index.
export const metadata: Metadata = {
  title: seoTitle("Free 5-Day ICT Crash Course"),
  description: seoDescription(
    "A free 5-day ICT crash course delivered by email. Market structure, order blocks, fair value gaps, killzone timing, and the funded account blueprint."
  ),
  keywords: [
    "ICT crash course",
    "free ICT course",
    "learn ICT trading",
    "ICT trading for beginners",
    "smart money concepts course",
  ],
  alternates: { canonical: "/crash-course" },
  openGraph: {
    title: "Free 5-Day ICT Crash Course | R2F Trading",
    description:
      "Five days, five lessons. Market structure, order blocks, fair value gaps, killzone timing, and the funded account blueprint. Delivered to your inbox.",
    url: "https://www.r2ftrading.com/crash-course",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

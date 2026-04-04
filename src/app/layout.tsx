import type { Metadata } from "next";
import { Bebas_Neue, Open_Sans, Merriweather } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import WhatsAppButton from "@/components/WhatsAppButton";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

const openSans = Open_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
});

const merriweather = Merriweather({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "R2F Trading — Professional ICT Coaching & Mentorship",
    template: "%s | R2F Trading",
  },
  description:
    "Charting the path to financial freedom. Professional ICT coaching with personalized one-on-one mentorship for traders at all levels. 10+ years of experience.",
  keywords: [
    "ICT trading", "trading mentorship", "forex coaching", "funded trader",
    "ICT concepts", "trading psychology", "prop firm coaching", "R2F Trading",
  ],
  authors: [{ name: "Harvest Wright", url: "https://www.r2ftrading.com/about" }],
  creator: "R2F Trading",
  metadataBase: new URL("https://www.r2ftrading.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "R2F Trading",
    title: "R2F Trading — Professional ICT Coaching & Mentorship",
    description: "Charting the path to financial freedom. Professional ICT coaching with personalized mentorship for traders at all levels.",
    url: "https://www.r2ftrading.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "R2F Trading — Professional ICT Coaching",
    description: "Charting the path to financial freedom with personalized ICT trading mentorship.",
  },
  alternates: {
    canonical: "https://www.r2ftrading.com",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  icons: {
    icon: "/favicon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${openSans.variable} ${merriweather.variable}`}
      style={{ height: "auto" }}
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DL8TG7YHRN"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DL8TG7YHRN');
          `}
        </Script>
      </head>
      <body className="antialiased" style={{ minHeight: "auto", display: "block" }}>
        {children}
        <WhatsAppButton />
        <ExitIntentPopup />
        <Analytics />
      </body>
    </html>
  );
}

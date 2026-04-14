import type { Metadata } from "next";
import { Bebas_Neue, Open_Sans, Merriweather } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import WhatsAppButton from "@/components/WhatsAppButton";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import BackToTop from "@/components/BackToTop";
import ChatWidget from "@/components/ChatWidget";
import SocialProof from "@/components/SocialProof";
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
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "R2F Trading — Professional ICT Coaching & Mentorship" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.jpg"],
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  icons: {
    icon: "/favicon.png",
  },
  other: {
    "p:domain_verify": "42be79c6382dce835c45d63181579078",
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
        {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
          <>
            <Script id="fb-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');fbq('track','PageView');`}
            </Script>
            <noscript><img height="1" width="1" style={{display:'none'}} src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_FB_PIXEL_ID}&ev=PageView&noscript=1`} alt="" /></noscript>
          </>
        )}
        {process.env.NEXT_PUBLIC_GOOGLE_ADS_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}`} strategy="afterInteractive" />
            <Script id="google-ads" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}');`}
            </Script>
          </>
        )}
      </head>
      <body className="antialiased" style={{ minHeight: "auto", display: "block" }}>
        {children}
        <WhatsAppButton />
        <BackToTop />
        <ChatWidget />
        <ExitIntentPopup />
        <SocialProof />
        <Analytics />
      </body>
    </html>
  );
}

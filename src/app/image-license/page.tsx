import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Image License & Usage Rights",
  description: "Licensing terms for images, charts, and visual content published on R2F Trading. Contact us for licensing inquiries.",
  alternates: { canonical: "/image-license" },
  robots: { index: true, follow: true },
};

export default function ImageLicensePage() {
  const year = new Date().getFullYear();

  return (
    <main>
      <Header />
      <section className="max-w-3xl mx-auto px-6 md:px-8 py-16">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-gold mb-3">Legal</p>
        <h1 className="text-3xl md:text-4xl font-bold text-navy mb-6">Image License &amp; Usage Rights</h1>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            All images, charts, annotations, infographics, diagrams, screenshots, and other visual
            content published on <strong>r2ftrading.com</strong> (including subdomains and associated
            syndication platforms) are the original work of R2F Trading and its authorized
            contributors unless explicitly credited otherwise.
          </p>

          <div className="bg-navy/5 border-l-4 border-gold p-5 rounded-r">
            <p className="font-bold text-navy text-sm uppercase tracking-wide mb-2">Copyright</p>
            <p className="text-sm">
              © {year} R2F Trading. All rights reserved. Images are protected under international
              copyright law.
            </p>
          </div>

          <h2 className="text-xl font-bold text-navy mt-10 mb-3">Permitted Use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Personal educational reference while reading our content</li>
            <li>Sharing a link to the article page containing the image</li>
            <li>Embedding via official social sharing buttons where provided</li>
          </ul>

          <h2 className="text-xl font-bold text-navy mt-10 mb-3">Prohibited Without License</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Redistribution, reposting, or republishing on third-party websites, blogs, or social media as original work</li>
            <li>Use in commercial products, courses, newsletters, or marketing materials</li>
            <li>Modification, derivative works, or AI training datasets</li>
            <li>Removal or alteration of R2F Trading watermarks, captions, or attribution</li>
          </ul>

          <h2 className="text-xl font-bold text-navy mt-10 mb-3">Attribution Requirements</h2>
          <p>
            If you receive written permission to use an image, you must credit the source as{" "}
            <strong>&ldquo;R2F Trading (r2ftrading.com)&rdquo;</strong> with a clickable link back to
            the original article.
          </p>

          <h2 className="text-xl font-bold text-navy mt-10 mb-3">Licensing Inquiries</h2>
          <p>
            For commercial use, syndication, educational licensing, or any other usage beyond the
            terms listed above, please{" "}
            <Link href="/contact" className="text-gold underline font-semibold">
              contact us
            </Link>{" "}
            with details of your intended use. We respond to licensing requests within 3 business
            days.
          </p>

          <h2 className="text-xl font-bold text-navy mt-10 mb-3">DMCA &amp; Takedown</h2>
          <p>
            If you believe content on this site infringes your copyright, please reach out via our{" "}
            <Link href="/contact" className="text-gold underline font-semibold">
              contact page
            </Link>{" "}
            with supporting documentation. Verified claims are actioned within 48 hours.
          </p>

          <p className="text-sm text-gray-500 mt-12 pt-6 border-t">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}

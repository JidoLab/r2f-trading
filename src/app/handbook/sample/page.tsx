import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTracker from "@/components/PageTracker";
import Link from "next/link";
import type { Metadata } from "next";
import { HANDBOOK } from "@/lib/handbook";

export const metadata: Metadata = {
  title: { absolute: "Your sample is ready | R2F Trading" },
  robots: { index: false, follow: false },
};

export default function HandbookSamplePage() {
  return (
    <main>
      <Header />
      <PageTracker event="handbook_sample_view" />
      <section className="bg-navy py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Your five chapters are ready
          </h1>
          <p className="text-white/60 mb-8">
            The PDF opens below. The ICT Funded-Trader Playbook is on its way to your inbox as well.
          </p>
          <a
            href={HANDBOOK.samplePath}
            className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-4 rounded-md transition-all uppercase"
          >
            Open the sample (PDF)
          </a>
          <div className="mt-10 text-white/50 text-sm space-y-2">
            {HANDBOOK.amazonPaperback ? (
              <p>
                Want the whole handbook?{" "}
                <a href={HANDBOOK.amazonPaperback} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Paperback on Amazon</a>
                {HANDBOOK.amazonKindle && (
                  <>
                    {" "}or{" "}
                    <a href={HANDBOOK.amazonKindle} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Kindle</a>
                  </>
                )}
                .
              </p>
            ) : (
              <p>The full handbook is coming to Amazon in paperback and Kindle. You will hear about it by email.</p>
            )}
            <p>
              Watch the live NQ session every weekday: <Link href="/live" className="text-gold hover:underline">r2ftrading.com/live</Link>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

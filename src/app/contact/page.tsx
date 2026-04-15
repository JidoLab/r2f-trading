import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CalendlyEmbed from "@/components/CalendlyEmbed";
import PageTracker from "@/components/PageTracker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Free Discovery Call",
  description: "Schedule a free discovery call with Harvest Wright to discuss your trading goals. No commitment — just a conversation about how ICT coaching can help you get funded.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Book a Free Discovery Call — R2F Trading",
    description: "Schedule a free call to discuss your trading goals and how ICT coaching can help.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <main>
      <Header />
      <PageTracker event="contact_page_view" />

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1
              className="text-4xl md:text-5xl font-bold text-navy mb-4"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Book a Discovery Call
            </h1>
            <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Take the first step toward transforming your craft and trade like a professional. Use the scheduler below to book a time that works for you. Let&rsquo;s discuss your goals, challenges, and how we can work together to achieve your success.
            </p>
          </div>

          {/* FAQ before booking */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-5 text-center">
              <p className="text-navy font-bold text-sm mb-1">What happens on the call?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                A casual 15-minute chat about your trading goals. I&rsquo;ll give honest feedback — no pitch, no pressure.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-5 text-center">
              <p className="text-navy font-bold text-sm mb-1">Is it really free?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                100% free, zero commitment. Just a conversation to see if coaching is right for you.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-5 text-center">
              <p className="text-navy font-bold text-sm mb-1">What timezone are you in?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                I&rsquo;m based in Bangkok (GMT+7). Sessions available mornings, evenings, and weekends to fit your schedule.
              </p>
            </div>
          </div>

          <CalendlyEmbed />

          <div className="mt-16 border-t border-gray-200 pt-12">
            <h2
              className="text-2xl md:text-3xl font-bold text-navy mb-6 text-center"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Prefer Direct Contact?
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Have a specific question, business inquiry, or just want to chat? No problem!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <a
                href="mailto:road2funded@gmail.com"
                className="flex flex-col items-center p-6 rounded-lg border border-gray-200 hover:border-gold/40 transition-colors"
              >
                <svg className="w-8 h-8 text-gold mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-bold text-navy">Email</span>
                <span className="text-xs text-gray-500 mt-1">road2funded@gmail.com</span>
              </a>

              <a
                href="https://wa.me/66935754757"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-6 rounded-lg border border-gray-200 hover:border-gold/40 transition-colors"
              >
                <svg className="w-8 h-8 text-gold mb-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="text-sm font-bold text-navy">WhatsApp</span>
                <span className="text-xs text-gray-500 mt-1">Send a message</span>
              </a>

              <a
                href="https://t.me/Road2Funded"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-6 rounded-lg border border-gray-200 hover:border-gold/40 transition-colors"
              >
                <svg className="w-8 h-8 text-gold mb-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span className="text-sm font-bold text-navy">Telegram</span>
                <span className="text-xs text-gray-500 mt-1">Send a message</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

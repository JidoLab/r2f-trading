import EmailSignup from "@/components/EmailSignup";

export default function LeadCaptureSection() {
  return (
    <section className="py-12 md:py-16 bg-cream">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2
          className="text-2xl md:text-3xl font-bold text-navy mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Get Your Free ICT Trading Checklist
        </h2>
        <p className="text-gray-600 text-sm mb-2">
          The exact pre-trade, during-trade, and post-trade checklist I use for every setup. Join
          the R2F community and start trading with more discipline today.
        </p>
        <p className="text-gold font-semibold text-sm mb-6 flex items-center justify-center gap-2">
          <span className="flex -space-x-2">
            <span className="w-6 h-6 rounded-full bg-navy/20 border-2 border-cream inline-block" />
            <span className="w-6 h-6 rounded-full bg-navy/30 border-2 border-cream inline-block" />
            <span className="w-6 h-6 rounded-full bg-navy/40 border-2 border-cream inline-block" />
          </span>
          Join 50+ traders who downloaded this checklist
        </p>
        <EmailSignup variant="inline" />
      </div>
    </section>
  );
}

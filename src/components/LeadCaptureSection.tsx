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
        <p className="text-gray-600 text-sm mb-6">
          The exact pre-trade, during-trade, and post-trade checklist I use for every setup. Join
          the R2F community and start trading with more discipline today.
        </p>
        <EmailSignup variant="inline" />
      </div>
    </section>
  );
}

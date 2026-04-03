const features = [
  {
    title: "Adaptable for All Levels and Traders",
    description: "The expertise I bring to the table works on any market, any asset, any timeframe, and any trader.",
    icon: "/icons/adaptable.png",
  },
  {
    title: "Clarity and Structure",
    description: "No more second-guessing or chasing random strategies. You'll learn a clear, step-by-step process rooted in ICT Concepts.",
    icon: "/icons/clarity.png",
  },
  {
    title: "Psychological Mastery",
    description: "Develop the mindset needed to handle market challenges with confidence and stay focused on your long-term goals.",
    icon: "/icons/psychology.png",
  },
  {
    title: "Consistency in Results",
    description: "Trading isn't about luck. I'll help you build a solid foundation that delivers sustainable, repeatable success.",
    icon: "/icons/consistency.png",
  },
  {
    title: "Personalized Mentorship",
    description: "Each trader is unique. Every session is customized to align with your strengths, goals, and challenges.",
    icon: "/icons/mentorship.png",
  },
  {
    title: "Deep Market Understanding",
    description: "You'll learn to see the markets differently, understanding price movements and institutional signatures on a deeper, actionable level.",
    icon: "/icons/market.png",
  },
  {
    title: "Trading System Development",
    description: "We will develop your own personal trading system based on what works for you as an individual and as a trader.",
    icon: "/icons/system.png",
  },
];

export default function Methodology() {
  return (
    <section className="py-16 md:py-24 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <h2
          className="text-3xl md:text-4xl font-bold text-navy mb-6"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          The R2F Methodology
        </h2>
        <p className="text-gray-600 leading-relaxed mb-12 max-w-4xl">
          Choosing R2F isn&rsquo;t just about learning to trade&mdash;it&rsquo;s about transforming how you approach the markets and yourself. Here&rsquo;s what you can expect:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-6 md:gap-8 mb-12">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center text-center group">
              <img
                src={feature.icon}
                alt={feature.title}
                className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-44 lg:h-44 object-contain mb-4"
              />
              <p className="text-sm sm:text-base md:text-lg font-bold text-navy/80 leading-tight">
                {feature.title}
              </p>
            </div>
          ))}
        </div>

        <p
          className="text-navy/80 italic text-center text-base md:text-lg max-w-3xl mx-auto"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          &ldquo;With R2F, you&rsquo;re not just getting education&mdash;you&rsquo;re gaining a partner in your trading journey, committed to your growth and success. Let&rsquo;s get you where you want to be.&rdquo;
        </p>
      </div>
    </section>
  );
}

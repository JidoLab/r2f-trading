const testimonials = [
  {
    quote: "Before working with R2F, I constantly second-guessed every decision I made. Now I can actually see consistent and gradual growth on my accounts! Harvest worked through all the aspects of my trading that was holding me back.",
    heading: "I finally feel confident in my trades",
    name: "T.W.",
  },
  {
    quote: "What stood out to me was how tailored the mentorship was. R2F didn't just give me generic strategies but truly focused on my strengths and weaknesses. The improvements I've seen in my trading psychology alone are incredible.",
    heading: "The personalized approach changed everything for me",
    name: "M.L.",
  },
  {
    quote: "I tried learning ICT on my own, but I was overwhelmed by the amount of content. Harvest broke down the concepts in an easy-to-follow way. I even got to learn his own personal methodologies that I've never seen anywhere else.",
    heading: "R2F gave me clarity on ICT Concepts",
    name: "H.C.",
  },
  {
    quote: "I got funded a couple of times but didn't know how to properly manage it and eventually lost the accounts. R2F's mentorship on scaling and risk management was a big lightbulb moment for me. I'm not only keeping my account but steadily growing it.",
    heading: "Turned my funded account into real growth",
    name: "A.S.",
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="max-w-6xl mx-auto px-6">
        <h2
          className="text-3xl md:text-4xl font-bold text-navy text-center mb-12"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Traders Who Walked the Road
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-lg p-8 shadow-sm border border-gray-100"
            >
              <p className="text-gold font-bold text-lg mb-3" style={{ fontFamily: "var(--font-serif)" }}>
                &ldquo;{t.heading}&rdquo;
              </p>
              <p className="text-gray-600 leading-relaxed mb-4 text-sm">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="text-navy font-bold text-sm">
                &mdash; {t.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

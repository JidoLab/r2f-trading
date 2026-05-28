export default function Banner() {
  return (
    <section className="bg-teal py-5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* text-cream (was text-gold) — gold-on-teal had 4.34:1 contrast,
            fails WCAG AA 4.5:1 for non-large italic medium text. Cream
            on teal is 7.32:1, passes AAA. */}
        <p
          className="text-cream text-lg md:text-xl italic font-medium"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          &ldquo;The market is not random, and neither is your success&mdash;are you finally ready to dictate your destiny?&rdquo;
        </p>
      </div>
    </section>
  );
}

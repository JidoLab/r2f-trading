import Link from "next/link";

export default function Banner() {
  return (
    <section className="bg-teal py-5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* text-cream on teal is 7.32:1, passes AAA. */}
        <p
          className="text-cream text-lg md:text-xl italic font-medium"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Live every weekday at the London open: NQ traded with ICT concepts, entries and stops said out loud.{" "}
          <Link href="/live" className="not-italic font-bold underline underline-offset-4 hover:text-white transition-colors">
            Watch the stream
          </Link>
        </p>
      </div>
    </section>
  );
}

import Link from "next/link";

export default function YouTubePreview() {
  return (
    <section className="py-16 md:py-24 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h2
              className="text-3xl md:text-4xl font-bold text-navy mb-4"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Watch &amp; Learn
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Get a taste of my teaching style and market insights on YouTube. Free educational content covering ICT concepts, live market breakdowns, and trading psychology.
            </p>
            <a
              href="https://www.youtube.com/@R2F-Trading"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-navy hover:bg-navy-light text-white font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase"
            >
              Subscribe on YouTube →
            </a>
          </div>
          <div className="w-full md:w-[420px] flex-shrink-0">
            <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
              <iframe
                src="https://www.youtube.com/embed?listType=user_uploads&list=R2F-Trading"
                title="R2F Trading YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

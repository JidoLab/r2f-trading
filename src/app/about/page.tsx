import Header from "@/components/Header";
import Footer from "@/components/Footer";

const faqs = [
  {
    category: "General Questions",
    items: [
      {
        q: "What is R2F Trading, and how does it work?",
        a: "R2F Trading (Road to Funded) is a personalized mentorship and coaching program designed to help traders master the skills and mindset needed to achieve consistent and scalable profitability.",
      },
      {
        q: "Who is this mentorship program for?",
        a: "The program is for anyone serious about improving their trading, whether you\u2019re a complete beginner, an intermediate trader looking to refine your approach, or even an experienced trader seeking advanced insights into ICT concepts.",
      },
      {
        q: "What does a typical coaching session include?",
        a: "Each session is tailored to your needs but typically includes technical and psychological insights, strategy refinement, and live market analysis. We\u2019ll also address any challenges you\u2019re facing in your trading journey.",
      },
      {
        q: "Do I need any prior trading experience to join?",
        a: "Not at all! Whether you\u2019re starting from scratch or have years of experience, the program is designed to meet you where you are and help you grow from there.",
      },
    ],
  },
  {
    category: "Program Details",
    items: [
      {
        q: "What trading platforms or tools will I need?",
        a: "Basically, all you\u2019ll need is access to a charting platform such as TradingView, which is completely free. I\u2019ll also recommend any additional tools or resources during our sessions.",
      },
      {
        q: "Do you provide any course materials or resources?",
        a: "Yes, I provide comprehensive materials, including chart templates, market analysis guides, and video recordings of key lessons, so you can continue learning between sessions.",
      },
      {
        q: "Can the mentorship be customized to fit my schedule?",
        a: "Absolutely! I work with you to create a schedule that fits your availability and time zone.",
      },
      {
        q: "Will I learn to create my own trading strategy?",
        a: "Yes! A core part of my coaching is empowering you to develop and refine a strategy that aligns with your goals and trading style. My job isn\u2019t done until you are flying on your own.",
      },
      {
        q: "What\u2019s the difference between the full mentorship program and other packages?",
        a: "The full mentorship offers a comprehensive, structured approach over a set number of months. It is perfect for beginners or those who want to start from scratch with ICT concepts and my personal methodologies.",
      },
    ],
  },
  {
    category: "Logistics and Payment",
    items: [
      {
        q: "Do you offer payment plans?",
        a: "Yes, flexible payment plans are available for the full mentorship plan. Let\u2019s discuss what works for you.",
      },
      {
        q: "How can I book a mentorship session or package?",
        a: "You can easily schedule a call through the website\u2019s contact form. After our discovery call, I\u2019ll guide you through the next steps to start our coaching together.",
      },
      {
        q: "What is your cancellation or refund policy?",
        a: "Cancellations are allowed with advance notice, and refunds are handled on a case-by-case basis. I\u2019m committed to ensuring you get value from my coaching.",
      },
    ],
  },
  {
    category: "Results and Expectations",
    items: [
      {
        q: "How soon can I expect to see results?",
        a: "Results depend on your level of commitment and current trading experience. Many students see significant improvement within the first month, but mastering trading is a personal journey, and not a quick fix.",
      },
      {
        q: "Do you guarantee funding or trading success?",
        a: "While I can\u2019t guarantee outcomes, I provide you with the tools, strategies, and support needed to give you the best chance at success. Your results will ultimately depend on your effort and discipline.",
      },
      {
        q: "Will I be able to trade independently after completing the mentorship?",
        a: "Yes! The mentorship is designed to make you self-sufficient. By the end, you\u2019ll have a robust trading framework and the confidence to navigate the markets on your own. This is always my primary goal when coaching other traders.",
      },
    ],
  },
  {
    category: "Miscellaneous",
    items: [
      {
        q: "Can I schedule a discovery call before committing?",
        a: "Of course! Discovery calls are a great way for us to discuss your goals and see if we\u2019re a good fit.",
      },
      {
        q: "Do you offer group coaching or only one-on-one sessions?",
        a: "I specialize in one-on-one coaching to provide a highly personalized experience, but I may consider small group sessions for students who are already acquainted with each other and wish to learn together.",
      },
      {
        q: "Are there any prerequisites for joining the program?",
        a: "No prerequisites are required \u2013 just a commitment to learning and an open mind.",
      },
    ],
  },
];

export default function AboutPage() {
  return (
    <main>
      <Header />

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h1
            className="text-4xl md:text-5xl font-bold text-navy mb-8"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            About R2F Trading
          </h1>
          <div className="flex flex-col md:flex-row gap-10 mb-16">
            <div className="flex-shrink-0">
              <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gold/30">
                <img src="/mentor.png" alt="Harvest" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <p className="text-gray-600 leading-relaxed mb-4">
                I&rsquo;m Harvest, the sole mentor behind R2F (Road 2 Funded). With 10+ years of experience in trading with ICT Concepts, and a passion for coaching traders, I&rsquo;ve developed my personal methodology that bridges the gap between confusion and clarity.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Whether you&rsquo;re new to trading or looking to refine your skills, I&rsquo;ll guide you every step of the way toward becoming a thriving, consistently profitable trader using the most effective techniques in the industry.
              </p>
            </div>
          </div>

          <h2
            className="text-3xl md:text-4xl font-bold text-navy mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Frequently Asked Questions
          </h2>

          {faqs.map((section) => (
            <div key={section.category} className="mb-10">
              <h3 className="text-xl font-bold text-navy mb-4">{section.category}</h3>
              <div className="space-y-4">
                {section.items.map((faq) => (
                  <details key={faq.q} className="group border border-gray-200 rounded-lg">
                    <summary className="cursor-pointer px-6 py-4 font-semibold text-navy/90 hover:text-gold transition-colors list-none flex items-center justify-between">
                      {faq.q}
                      <span className="text-gold ml-4 group-open:rotate-45 transition-transform text-xl">+</span>
                    </summary>
                    <div className="px-6 pb-4 text-gray-600 leading-relaxed text-sm">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}

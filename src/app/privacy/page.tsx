import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <main>
      <Header />

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 prose prose-gray max-w-none">
          <h1
            className="text-4xl md:text-5xl font-bold text-navy mb-8"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm mb-8">Effective Date: 19th November 2024</p>

          <p className="text-gray-600 leading-relaxed mb-6">
            At R2FTrading.com, your privacy is of utmost importance to us. This Privacy Policy explains how we collect, use, and protect your personal information.
          </p>

          <h2 className="text-xl font-bold text-navy mt-10 mb-4">1. Information We Collect</h2>
          <p className="text-gray-600 leading-relaxed mb-3">We may collect personal information when you:</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
            <li>Fill out forms on our website (e.g., contact forms, discovery call forms).</li>
            <li>Subscribe to our newsletters or services.</li>
            <li>Interact with our website (e.g., via cookies or analytics).</li>
          </ul>

          <h2 className="text-xl font-bold text-navy mt-10 mb-4">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
            <li>Provide personalized coaching services.</li>
            <li>Respond to inquiries and schedule calls.</li>
            <li>Improve our website and services through analytics.</li>
            <li>Send promotional content and updates, only with your consent.</li>
          </ul>

          <h2 className="text-xl font-bold text-navy mt-10 mb-4">3. Sharing of Information</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We do not sell, rent, or share your personal information with third parties, except as required for processing payments, service requests, or compliance with legal obligations.
          </p>

          <h2 className="text-xl font-bold text-navy mt-10 mb-4">4. Cookies and Tracking Technologies</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Our website uses cookies to enhance user experience and collect usage data. You can manage or disable cookies through your browser settings.
          </p>

          <h2 className="text-xl font-bold text-navy mt-10 mb-4">5. Your Rights</h2>
          <p className="text-gray-600 leading-relaxed mb-2">You have the right to:</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
            <li>Access, update, or delete your personal information.</li>
            <li>Opt-out of receiving promotional communications.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mb-4">
            To exercise these rights, contact us at road2funded@gmail.com.
          </p>

          <h2 className="text-xl font-bold text-navy mt-10 mb-4">6. Security</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We implement industry-standard measures to protect your information. However, no online platform is 100% secure.
          </p>

          <hr className="my-12 border-gray-200" />

          <h1
            className="text-4xl md:text-5xl font-bold text-navy mb-8"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Disclaimer
          </h1>

          <h2 className="text-xl font-bold text-navy mt-6 mb-4">Trading Risk Disclaimer</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            The content on www.R2FTrading.com is for educational purposes only. It does not constitute financial or investment advice. Trading financial instruments, including Forex, carries significant risk and may not be suitable for all investors.
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
            <li><strong>No Guarantees:</strong> While we aim to provide accurate and actionable information, we do not guarantee any specific results or financial outcomes.</li>
            <li><strong>Client Responsibility:</strong> It is your responsibility to evaluate your risk tolerance and trading experience before participating in any markets.</li>
            <li><strong>Third-Party Links:</strong> Our website may include links to third-party resources. We are not responsible for their content, services, or privacy practices.</li>
          </ul>

          <h2 className="text-xl font-bold text-navy mt-10 mb-4">Earnings Disclaimer</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Any references to potential earnings or success stories are illustrative and do not guarantee similar outcomes. Your results depend on various factors, including market conditions, your skills, and your commitment to learning.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            By using this website and our services, you acknowledge that you are aware of the risks involved in trading and you will not hold R2FTrading.com or its representatives liable for any losses incurred.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

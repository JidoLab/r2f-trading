"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface CalcResult {
  riskAmount: number;
  positionSize: number;
  rewardAmount: number;
  breakeven: number;
}

export default function RiskCalculatorPage() {
  const [accountSize, setAccountSize] = useState("");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [signupStatus, setSignupStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const router = useRouter();

  function calculate() {
    const acc = parseFloat(accountSize);
    const risk = parseFloat(riskPercent);
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    if (!acc || !risk || !entry || !sl) return;

    const riskAmount = acc * (risk / 100);
    const slDistance = Math.abs(entry - sl);
    const positionSize = slDistance > 0 ? riskAmount / slDistance : 0;
    const tpDistance = tp ? Math.abs(tp - entry) : 0;
    const rewardAmount = tp ? positionSize * tpDistance : 0;
    const breakeven = slDistance > 0 && tpDistance > 0 ? tpDistance / slDistance : 0;

    setResult({ riskAmount, positionSize, rewardAmount, breakeven });
    setShowSignup(true);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSignupStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "risk-calculator" }),
      });
      if (res.ok) {
        localStorage.setItem("r2f_subscriber_email", email);
        setSignupStatus("success");
        router.push("/thank-you");
      } else {
        setSignupStatus("error");
      }
    } catch {
      setSignupStatus("error");
    }
  }

  return (
    <main className="bg-navy min-h-screen">
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Trading Risk/Reward <span className="text-gold">Calculator</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Calculate your exact position size, risk amount, and reward-to-risk ratio before every trade.
            The same tool ICT traders use to protect their capital.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-white font-bold text-lg mb-6">Trade Parameters</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-white/50 text-sm font-medium mb-2">Account Size ($)</label>
                <input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-white/50 text-sm font-medium mb-2">Risk Per Trade (%)</label>
                <div className="flex gap-2">
                  {["0.5", "1", "1.5", "2"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setRiskPercent(v)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        riskPercent === v
                          ? "bg-gold text-navy"
                          : "bg-white/10 text-white/50 hover:bg-white/20"
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold min-w-[80px]"
                    step="0.1"
                    min="0.1"
                    max="10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/50 text-sm font-medium mb-2">Entry Price</label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="e.g. 1.0850"
                  step="any"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-white/50 text-sm font-medium mb-2">Stop Loss Price</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="e.g. 1.0820"
                  step="any"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-white/50 text-sm font-medium mb-2">Take Profit Price <span className="text-white/30">(optional)</span></label>
                <input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="e.g. 1.0940"
                  step="any"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
                />
              </div>
              <button
                onClick={calculate}
                disabled={!accountSize || !entryPrice || !stopLoss}
                className="w-full bg-gold hover:bg-gold-light text-navy font-bold py-4 rounded-lg transition-all uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed text-sm"
              >
                Calculate Position Size
              </button>
            </div>
          </div>

          {/* Results */}
          <div>
            {result ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h2 className="text-white font-bold text-lg mb-6">Your Trade Breakdown</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-white/50 text-sm">Risk Amount</span>
                    <span className="text-red-400 text-xl font-bold">${result.riskAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-white/50 text-sm">Position Size (units)</span>
                    <span className="text-white text-xl font-bold">{result.positionSize.toFixed(2)}</span>
                  </div>
                  {result.rewardAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-white/10">
                        <span className="text-white/50 text-sm">Potential Reward</span>
                        <span className="text-green-400 text-xl font-bold">${result.rewardAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/10">
                        <span className="text-white/50 text-sm">Reward : Risk Ratio</span>
                        <span className={`text-xl font-bold ${result.breakeven >= 2 ? "text-green-400" : result.breakeven >= 1 ? "text-yellow-400" : "text-red-400"}`}>
                          {result.breakeven.toFixed(1)}R
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* R:R visual gauge */}
                {result.breakeven > 0 && (
                  <div className="mt-6 bg-white/[0.03] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white/40 text-xs uppercase tracking-wider">Trade Quality</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          result.breakeven >= 3 ? "bg-green-400" :
                          result.breakeven >= 2 ? "bg-green-500" :
                          result.breakeven >= 1 ? "bg-yellow-500" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(result.breakeven / 5 * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-white/30 text-xs mt-2">
                      {result.breakeven >= 3 ? "Excellent trade setup — strong R:R" :
                       result.breakeven >= 2 ? "Good trade — meets ICT minimum standard" :
                       result.breakeven >= 1 ? "Marginal — consider widening TP or tightening SL" :
                       "Below 1R — not worth the risk. Re-evaluate this trade."}
                    </p>
                  </div>
                )}

                {/* Email capture */}
                {showSignup && signupStatus !== "success" && (
                  <div className="mt-6 bg-gold/5 border border-gold/20 rounded-lg p-5">
                    <p className="text-gold font-bold text-sm mb-1">Want more tools like this?</p>
                    <p className="text-white/50 text-xs mb-3">
                      Get the free ICT Trading Checklist + weekly trade ideas in your inbox.
                    </p>
                    <form onSubmit={handleSignup} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email"
                        required
                        className="flex-1 px-3 py-2.5 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
                      />
                      <button
                        type="submit"
                        disabled={signupStatus === "loading"}
                        className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2.5 rounded-md transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        {signupStatus === "loading" ? "..." : "Get Free"}
                      </button>
                    </form>
                    {signupStatus === "error" && <p className="text-red-400 text-xs mt-2">Something went wrong.</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center h-full min-h-[300px]">
                <p className="text-4xl mb-4">📊</p>
                <p className="text-white/40 text-center text-sm">
                  Enter your trade parameters and click calculate to see your position size, risk amount, and reward ratio.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SEO Content */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Why Position Sizing Matters in ICT Trading
          </h2>
          <div className="text-white/50 text-sm leading-relaxed space-y-4">
            <p>
              Position sizing is the single most important risk management tool in your trading arsenal.
              Even with the best ICT setups — perfect order blocks, clean fair value gaps, and textbook
              break of structure — a single oversized position can wipe out weeks of progress.
            </p>
            <p>
              Professional ICT traders never risk more than 1-2% of their account on a single trade.
              This calculator helps you determine the exact position size for every trade so you stay
              within your risk parameters and protect your funded account.
            </p>
            <p>
              The reward-to-risk ratio is equally critical. ICT methodology teaches us to target at least
              2R on every trade — meaning your potential profit should be at least twice your risk. This
              calculator shows you instantly whether a trade setup meets that standard.
            </p>
          </div>

          <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-gold font-bold text-sm mb-3">Ready to level up your trading?</h3>
            <p className="text-white/50 text-sm mb-4">
              This calculator is just the beginning. Get personalized 1-on-1 ICT coaching to master
              entries, exits, and risk management with real-time feedback.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/contact"
                className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-3 rounded-md transition-all uppercase"
              >
                Book Free Discovery Call
              </a>
              <a
                href="/free-class"
                className="border border-white/20 hover:border-gold text-white hover:text-gold font-bold text-sm px-6 py-3 rounded-md transition-all uppercase"
              >
                Free ICT Class
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

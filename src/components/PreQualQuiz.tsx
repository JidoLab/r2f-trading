"use client";

import { useState } from "react";
import CalendlyEmbed from "./CalendlyEmbed";
import Link from "next/link";

const QUESTIONS = [
  {
    id: "experience",
    question: "How long have you been trading?",
    options: [
      { label: "I haven't started yet", score: 1 },
      { label: "Less than 6 months", score: 2 },
      { label: "6 months – 2 years", score: 3 },
      { label: "2+ years", score: 4 },
    ],
  },
  {
    id: "ict",
    question: "How familiar are you with ICT concepts?",
    options: [
      { label: "Never heard of ICT", score: 1 },
      { label: "I've watched some YouTube videos", score: 2 },
      { label: "I understand the basics (FVG, OB, liquidity)", score: 3 },
      { label: "I trade with ICT daily but want refinement", score: 4 },
    ],
  },
  {
    id: "goal",
    question: "What's your primary trading goal?",
    options: [
      { label: "Learn the basics of trading", score: 1 },
      { label: "Pass a prop firm challenge (FTMO, etc.)", score: 4 },
      { label: "Become consistently profitable", score: 3 },
      { label: "Fix specific weaknesses in my strategy", score: 4 },
    ],
  },
  {
    id: "commitment",
    question: "How much time can you dedicate weekly?",
    options: [
      { label: "A few hours when I can", score: 1 },
      { label: "5-10 hours per week", score: 3 },
      { label: "10-20 hours per week", score: 4 },
      { label: "Full-time — trading is my priority", score: 4 },
    ],
  },
  {
    id: "budget",
    question: "Are you ready to invest in coaching?",
    options: [
      { label: "I'm exploring free options first", score: 1 },
      { label: "I could invest $150-200/week if it's right", score: 3 },
      { label: "I'm ready to invest — I need results", score: 4 },
      { label: "Budget isn't an issue if I see value", score: 4 },
    ],
  },
];

type Answers = Record<string, number>;

export default function PreQualQuiz() {
  const [step, setStep] = useState(0); // 0 = intro, 1-5 = questions, 6 = result
  const [answers, setAnswers] = useState<Answers>({});

  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const maxScore = QUESTIONS.length * 4;
  const isQualified = totalScore >= 12; // 60%+ threshold

  function handleAnswer(questionId: string, score: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
    setStep((s) => s + 1);
  }

  // Intro screen
  if (step === 0) {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="bg-gray-50 rounded-xl p-8 md:p-10 border border-gray-200">
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy mb-3" style={{ fontFamily: "var(--font-serif)" }}>
            Quick Pre-Call Assessment
          </h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Answer 5 quick questions so I can prepare for our call and give you the most value in 15 minutes. Takes under 30 seconds.
          </p>
          <button
            onClick={() => setStep(1)}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-3 rounded-md transition-all uppercase"
          >
            Start Assessment
          </button>
          <p className="text-gray-400 text-xs mt-4">
            Or <button onClick={() => setStep(QUESTIONS.length + 1)} className="text-gold hover:underline">skip to booking</button>
          </p>
        </div>
      </div>
    );
  }

  // Question screens
  if (step >= 1 && step <= QUESTIONS.length) {
    const q = QUESTIONS[step - 1];
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-gray-50 rounded-xl p-8 md:p-10 border border-gray-200">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-gray-400 font-medium">{step}/{QUESTIONS.length}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-gold rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${(step / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          <h3 className="text-xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>
            {q.question}
          </h3>

          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleAnswer(q.id, opt.score)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gold/50 hover:bg-gold/5 transition-all text-sm text-gray-700 font-medium"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-gray-400 hover:text-gray-600 text-xs mt-4 transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Result screen
  return (
    <div>
      {isQualified ? (
        <>
          {/* Qualified — show Calendly */}
          <div className="max-w-xl mx-auto text-center mb-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
                Great Match for Coaching
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Based on your answers, personalized coaching would be a strong fit. Book a free 15-minute discovery call below — I&rsquo;ll come prepared with recommendations specific to your situation.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-5 text-center">
              <p className="text-navy font-bold text-sm mb-1">What happens on the call?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                A casual 15-minute chat about your trading goals. I&rsquo;ll give honest feedback — no pitch, no pressure.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-5 text-center">
              <p className="text-navy font-bold text-sm mb-1">Is it really free?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                100% free, zero commitment. Just a conversation to see if coaching is right for you.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-5 text-center">
              <p className="text-navy font-bold text-sm mb-1">What timezone?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Bangkok (GMT+7). Sessions available mornings, evenings, and weekends.
              </p>
            </div>
          </div>

          <CalendlyEmbed />
        </>
      ) : (
        <>
          {/* Not yet ready — redirect to free content */}
          <div className="max-w-xl mx-auto text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
                Start With Our Free Resources
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Based on your answers, I&rsquo;d recommend building a foundation first. Our free crash course covers the exact ICT setups and psychology you need — then we can talk coaching when you&rsquo;re ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/crash-course"
                  className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase"
                >
                  Free 5-Day Crash Course
                </Link>
                <Link
                  href="/free-class"
                  className="inline-block bg-white border border-gray-300 hover:border-gold text-navy font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase"
                >
                  Free ICT Class
                </Link>
              </div>
              <p className="text-gray-400 text-xs mt-5">
                Already know what you need?{" "}
                <button
                  onClick={() => {
                    setAnswers({});
                    setStep(QUESTIONS.length + 1);
                  }}
                  className="text-gold hover:underline"
                >
                  Skip to booking anyway
                </button>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

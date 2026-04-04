"use client";

import { useRef } from "react";

export default function SignaturePage() {
  const sigRef = useRef<HTMLDivElement>(null);

  function copySignature() {
    if (!sigRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(sigRef.current);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand("copy");
    sel?.removeAllRanges();
    alert("Signature copied! Paste it into your email settings.");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Email Signature</h1>
      <p className="text-white/50 text-sm mb-8">Copy this signature and paste it into your Gmail settings (Settings → General → Signature).</p>

      <div className="bg-white rounded-lg p-8 mb-6">
        <div ref={sigRef}>
          <table cellPadding="0" cellSpacing="0" style={{ fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#333" }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: "16px", borderRight: "3px solid #c9a84c", verticalAlign: "top" }}>
                  <img
                    src="https://r2ftrading.com/mentor.png"
                    alt="Harvest Wright"
                    width="80"
                    height="80"
                    style={{ borderRadius: "50%", display: "block" }}
                  />
                </td>
                <td style={{ paddingLeft: "16px", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: "#0d2137", marginBottom: "2px" }}>
                    Harvest Wright
                  </div>
                  <div style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                    ICT Trading Mentor · R2F Trading
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", lineHeight: "1.8" }}>
                    🌐 <a href="https://r2ftrading.com" style={{ color: "#c9a84c", textDecoration: "none" }}>r2ftrading.com</a>
                    {" · "}
                    📧 <a href="mailto:road2funded@gmail.com" style={{ color: "#c9a84c", textDecoration: "none" }}>road2funded@gmail.com</a>
                    <br />
                    📱 <a href="https://wa.me/66935754757" style={{ color: "#c9a84c", textDecoration: "none" }}>WhatsApp</a>
                    {" · "}
                    ✈️ <a href="https://t.me/Road2Funded" style={{ color: "#c9a84c", textDecoration: "none" }}>Telegram</a>
                    {" · "}
                    📺 <a href="https://youtube.com/@R2F-Trading" style={{ color: "#c9a84c", textDecoration: "none" }}>YouTube</a>
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#c9a84c", fontStyle: "italic" }}>
                    📊 Book a free discovery call → <a href="https://r2ftrading.com/contact" style={{ color: "#c9a84c", fontWeight: 700, textDecoration: "none" }}>r2ftrading.com/contact</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={copySignature}
        className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-8 py-3 rounded-md transition-all uppercase tracking-wide"
      >
        Copy Signature
      </button>
    </div>
  );
}

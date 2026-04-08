"use client";

import { useEffect, useRef, useState } from "react";

interface PayPalButtonProps {
  planName: string;
  amount: string;
  description: string;
  onSuccess?: (details: Record<string, unknown>) => void;
  highlight?: boolean;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => { render: (el: HTMLElement) => void };
    };
  }
}

export default function PayPalButton({ planName, amount, description, onSuccess, highlight = false }: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [showPaypal, setShowPaypal] = useState(false);
  const [completed, setCompleted] = useState(false);
  const rendered = useRef(false);

  // Load PayPal SDK
  useEffect(() => {
    if (window.paypal) {
      setSdkReady(true);
      return;
    }
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => setSdkReady(true);
    document.body.appendChild(script);
  }, []);

  // Render PayPal buttons when shown
  useEffect(() => {
    if (!sdkReady || !showPaypal || !containerRef.current || rendered.current) return;
    if (!window.paypal) return;

    rendered.current = true;

    window.paypal.Buttons({
      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "pay",
        height: 45,
      },
      createOrder: (_data: unknown, actions: { order: { create: (opts: Record<string, unknown>) => Promise<string> } }) => {
        return actions.order.create({
          purchase_units: [{
            description: `R2F Trading — ${planName}`,
            amount: {
              currency_code: "USD",
              value: amount,
            },
          }],
          application_context: {
            brand_name: "R2F Trading",
            shipping_preference: "NO_SHIPPING",
          },
        });
      },
      onApprove: async (_data: unknown, actions: { order: { capture: () => Promise<Record<string, unknown>> } }) => {
        const details = await actions.order.capture();
        setCompleted(true);
        setShowPaypal(false);

        // Notify backend
        try {
          await fetch("/api/payment-success", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: planName,
              amount,
              payerEmail: (details.payer as Record<string, unknown>)?.email_address || "",
              payerName: ((details.payer as Record<string, unknown>)?.name as Record<string, unknown>)?.given_name || "",
              orderId: details.id,
              status: details.status,
            }),
          });
        } catch {}

        onSuccess?.(details);
      },
      onCancel: () => {
        // User closed PayPal popup — keep the button visible
      },
      onError: (err: unknown) => {
        console.error("PayPal error:", err);
        alert("Payment failed. Please try again or contact us directly.");
      },
    }).render(containerRef.current!);
  }, [sdkReady, showPaypal, planName, amount, onSuccess]);

  if (completed) {
    return (
      <div className="text-center py-3">
        <div className="text-green-500 font-bold text-lg mb-1">✓ Payment Received!</div>
        <p className="text-sm text-gray-500">Check your email for confirmation. We&apos;ll be in touch within 24 hours.</p>
      </div>
    );
  }

  // If no PayPal client ID, fall back to contact link
  if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
    return null; // Don't render — the regular "Get Started" link handles it
  }

  return (
    <div className="mt-3">
      {!showPaypal ? (
        <button
          onClick={() => setShowPaypal(true)}
          className={`w-full text-center font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase ${
            highlight
              ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
              : "bg-gray-200 hover:bg-gray-300 text-navy"
          }`}
        >
          Pay with PayPal
        </button>
      ) : (
        <div>
          <div className="text-center mb-2">
            <span className={`text-xs ${highlight ? "text-white/60" : "text-gray-500"}`}>
              {description} — ${amount} USD
            </span>
          </div>
          <div ref={containerRef} />
          <button
            onClick={() => { setShowPaypal(false); rendered.current = false; }}
            className={`mt-2 w-full text-center text-xs py-1 ${highlight ? "text-white/50 hover:text-white/70" : "text-gray-400 hover:text-gray-600"}`}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

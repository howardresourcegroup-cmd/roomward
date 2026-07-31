"use client";

import { useState, useEffect } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { motion } from "framer-motion";
import { Check, Lock, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PLAN_FEATURES = [
  "Unlimited buildings, floors & rooms",
  "Work orders, housekeeping & assets",
  "RoomMaster + Eptura integrations",
  "Roles, permissions & team chat",
  "Realtime updates across your team",
];

// Dark-theme appearance to match the app. CSS variables don't cross into Stripe's
// iframe, so we name Inter directly and load it via the `fonts` option below.
const appearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#6366f1",
    colorBackground: "#0f0f1a",
    colorText: "#e4e4e7",
    colorTextSecondary: "#a1a1aa",
    colorDanger: "#ef4444",
    borderRadius: "10px",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontSizeBase: "14px",
  },
};

// Load Inter into the Stripe iframe so its font matches the app
const fontsOption = [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" }];

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<{ amount: number; tier: string; userCount: number }>({ amount: 149, tier: "standard", userCount: 0 });

  useEffect(() => {
    if (!open || clientSecret) return;
    setLoading(true); setError("");
    fetch("/api/billing/subscribe", { method: "POST", credentials: "same-origin" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not start checkout");
        if (!data.publishableKey) throw new Error("Stripe publishable key not configured");
        setStripePromise(loadStripe(data.publishableKey));
        setClientSecret(data.clientSecret);
        if (data.amount) setPlan({ amount: data.amount, tier: data.tier, userCount: data.userCount });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, clientSecret]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 max-h-[90vh] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.1fr] rounded-xl overflow-hidden">
          {/* Left: plan */}
          <div className="bg-gradient-to-br from-indigo-500/[0.12] to-transparent p-6 sm:border-r border-border">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold text-foreground">
                {plan.tier === "large" ? "Roomward Pro" : "Roomward Standard"}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-3xl font-bold text-foreground">${plan.amount}</span>
              <span className="text-sm text-muted-foreground">/mo per property</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {plan.tier === "large"
                ? `Pro tier · ${plan.userCount} users · billed monthly`
                : "Billed monthly · cancel anytime"}
            </p>
            <ul className="mt-5 space-y-2.5">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="https://howardresourcegroup.com/business.html#hotel-stack" target="_blank" rel="noopener"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 mt-4">
              Save $100/mo with a Managed IT plan →
            </a>
          </div>

          {/* Right: payment */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Payment details</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            {loading && <p className="text-xs text-muted-foreground py-8 text-center">Preparing secure checkout…</p>}

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
                {error.includes("configured") && (
                  <p className="text-muted-foreground mt-1">Add your Stripe keys to enable live billing.</p>
                )}
              </div>
            )}

            {clientSecret && stripePromise && !error && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance, fonts: fontsOption }}>
                <PaymentForm onClose={onClose} />
              </Elements>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Secured by Stripe · PCI-compliant
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true); setError("");
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/settings?billing=success` },
      redirect: "if_required",
    });
    if (err) { setError(err.message ?? "Payment failed"); setSubmitting(false); return; }
    setDone(true);
    setTimeout(() => { onClose(); window.location.href = "/settings?billing=success"; }, 1500);
  };

  if (done) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3">
          <Check className="h-6 w-6 text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-foreground">You&apos;re subscribed!</p>
        <p className="text-xs text-muted-foreground mt-1">Welcome to Roomward Pro.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{
        // Card shown & expanded by default; other methods collapse into rows below
        layout: { type: "accordion", defaultCollapsed: false },
      }} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button type="submit" className="w-full" disabled={!stripe || submitting}>
        {submitting ? "Processing…" : "Subscribe"}
      </Button>
    </form>
  );
}

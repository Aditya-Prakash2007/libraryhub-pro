"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CheckCircle2, Zap, Crown, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { createSubscriptionOrder } from "@/actions/subscription";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Library {
  id: string;
  name: string;
  isTrialActive: boolean;
  trialEndsAt?: Date | null;
  subscription?: {
    plan: string;
    status: string;
    endDate?: Date | null;
  } | null;
}

interface SubscriptionPageProps {
  library: Library | null;
}

const PLANS = [
  {
    id: "MONTHLY",
    name: "Monthly",
    price: 600,
    originalPrice: 600,
    discount: 0,
    duration: "1 month",
    months: 1,
    icon: Building2,
    color: "from-indigo-500 to-violet-600",
    popular: false,
    features: [
      "Unlimited students",
      "Unlimited seats",
      "QR attendance system",
      "Razorpay payments",
      "PDF receipts & invoices",
      "Analytics & reports",
      "Email notifications (Brevo)",
      "Student portal access",
    ],
  },
  {
    id: "HALF_YEARLY",
    name: "6 Months",
    price: 3000,
    originalPrice: 3600,
    discount: 17,
    duration: "6 months",
    months: 6,
    icon: Zap,
    color: "from-violet-500 to-purple-600",
    popular: true,
    features: [
      "Everything in Monthly",
      "17% discount",
      "Priority email support",
      "Bulk student import",
      "Excel & PDF export",
    ],
  },
  {
    id: "YEARLY",
    name: "12 Months",
    price: 5500,
    originalPrice: 7200,
    discount: 24,
    duration: "12 months",
    months: 12,
    icon: Crown,
    color: "from-amber-500 to-orange-600",
    popular: false,
    features: [
      "Everything in Monthly",
      "24% discount",
      "Best value plan",
      "Dedicated support",
      "Custom branding",
    ],
  },
];

export function SubscriptionPage({ library }: SubscriptionPageProps) {
  const [paying, setPaying] = useState<string | null>(null);

  const currentPlan = library?.subscription?.plan;
  const isTrialActive = library?.isTrialActive;
  const trialEndsAt = library?.trialEndsAt;
  const subEndDate = library?.subscription?.endDate;

  const handleSubscribe = async (plan: typeof PLANS[0]) => {
    if (!library) { toast.error("Library not found"); return; }
    setPaying(plan.id);

    try {
      const result = await createSubscriptionOrder({
        libraryId: library.id,
        planId: plan.id,
        amount: plan.price,
        months: plan.months,
      });

      if ("error" in result) { toast.error(result.error); setPaying(null); return; }

      await openRazorpayCheckout({
        key: result.key!,
        amount: plan.price * 100,
        currency: "INR",
        name: "LibraryHub Pro",
        description: `${plan.name} Subscription — ${library.name}`,
        order_id: result.orderId!,
        prefill: {},
        theme: { color: "#6366f1" },
        handler: async (response) => {
          const verify = await fetch("/api/subscription/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId: result.dbOrderId,
              libraryId: library.id,
              months: plan.months,
            }),
          });
          const data = await verify.json();
          if (data.success) {
            toast.success(`🎉 ${plan.name} plan activated!`);
            window.location.reload();
          } else {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        modal: { ondismiss: () => setPaying(null) },
      });
    } catch (err) {
      toast.error("Something went wrong. Try again.");
      setPaying(null);
    }
  };

  const msLeft = trialEndsAt ? trialEndsAt.getTime() - Date.now() : 0;
  const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Choose Your Plan"
        description="Power up your library with a LibraryHub Pro subscription"
      />

      {/* Current status banner */}
      {isTrialActive && trialEndsAt && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
        >
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-500">Free Trial Active</p>
            <p className="text-sm text-muted-foreground">
              {hoursLeft > 0 ? `${hoursLeft} hours remaining` : "Trial ending soon!"} — expires {formatDate(trialEndsAt)}
            </p>
          </div>
        </motion.div>
      )}

      {subEndDate && !isTrialActive && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
          <p className="text-sm">
            Current plan: <strong>{currentPlan}</strong> · Expires: {formatDate(subEndDate)}
          </p>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold shadow-lg">
                  Most Popular
                </span>
              </div>
            )}

            <Card className={`overflow-hidden h-full flex flex-col ${plan.popular ? "ring-2 ring-violet-500/50 shadow-xl shadow-violet-500/10" : ""}`}>
              {/* Color top bar */}
              <div className={`h-2 bg-gradient-to-r ${plan.color}`} />

              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                    <plan.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.duration}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">₹{plan.price.toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground text-sm">/{plan.duration}</span>
                  </div>
                  {plan.discount > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground line-through">
                        ₹{plan.originalPrice.toLocaleString("en-IN")}
                      </span>
                      <Badge className="bg-emerald-500/15 text-emerald-500 text-xs">
                        Save {plan.discount}%
                      </Badge>
                    </div>
                  )}
                  {plan.months > 1 && (
                    <p className="text-xs text-indigo-400 mt-1">
                      ₹{Math.round(plan.price / plan.months).toLocaleString("en-IN")}/month
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full bg-gradient-to-r ${plan.color} text-white border-0 hover:opacity-90`}
                  onClick={() => handleSubscribe(plan)}
                  loading={paying === plan.id}
                  disabled={!!paying}
                >
                  {paying === plan.id ? "Processing..." : "Subscribe Now"}
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-2">
                  Secure payment via Razorpay
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Frequently Asked Questions</h3>
          {[
            { q: "Can I upgrade later?", a: "Yes, you can upgrade to any plan at any time. The new plan starts from your upgrade date." },
            { q: "What payment methods are accepted?", a: "UPI, Credit/Debit cards, Net Banking, and Wallets via Razorpay." },
            { q: "Is there a refund policy?", a: "Contact support within 7 days for a refund. Each case is reviewed individually." },
            { q: "Does it auto-renew?", a: "No, you need to manually renew. You'll receive reminders before expiry." },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <p className="font-medium text-sm mb-1">{q}</p>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

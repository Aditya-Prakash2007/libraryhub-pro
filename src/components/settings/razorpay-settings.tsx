"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, CreditCard, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveRazorpayKeys } from "@/actions/library";

interface RazorpaySettingsProps {
  razorpayKeyId?: string | null;
  hasSecret?: boolean; // Don't show actual secret, just whether it's set
}

interface RazorpayForm {
  keyId: string;
  keySecret: string;
}

export function RazorpaySettings({ razorpayKeyId, hasSecret }: RazorpaySettingsProps) {
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RazorpayForm>({
    defaultValues: { keyId: razorpayKeyId || "", keySecret: "" },
  });

  const keyId = watch("keyId");

  const onSubmit = async (data: RazorpayForm) => {
    if (!data.keyId.trim() || !data.keySecret.trim()) {
      toast.error("Both Key ID and Key Secret are required");
      return;
    }
    setSaving(true);
    const result = await saveRazorpayKeys(data.keyId.trim(), data.keySecret.trim());
    setSaving(false);
    if ("error" in result) toast.error(result.error);
    else toast.success("Razorpay keys saved! Student payments will now go to your account.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-500" />
          Razorpay Payment Settings
        </CardTitle>
        <CardDescription>
          Add your Razorpay API keys so student fee payments go directly to your bank account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Status indicator */}
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${
          razorpayKeyId && hasSecret
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-amber-500/10 border-amber-500/30"
        }`}>
          {razorpayKeyId && hasSecret ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-medium text-sm ${razorpayKeyId && hasSecret ? "text-emerald-400" : "text-amber-400"}`}>
              {razorpayKeyId && hasSecret
                ? "✅ Razorpay configured — payments go to your account"
                : "⚠️ Razorpay not configured — using platform keys (payments may not reach you)"}
            </p>
            {razorpayKeyId && (
              <p className="text-xs text-muted-foreground mt-0.5">Key ID: {razorpayKeyId}</p>
            )}
          </div>
        </div>

        {/* Setup guide */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-sm space-y-2">
          <p className="font-medium">How to get your Razorpay keys:</p>
          <ol className="space-y-1.5 text-muted-foreground text-xs">
            <li>1. Go to <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">razorpay.com <ExternalLink className="w-3 h-3" /></a> → Create account</li>
            <li>2. Dashboard → Settings → API Keys</li>
            <li>3. Generate Test/Live key pair</li>
            <li>4. Copy Key ID & Key Secret below</li>
            <li>5. Student payments will credit directly to your Razorpay account</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Razorpay Key ID *</Label>
            <Input
              placeholder="rzp_live_xxxxxxxxxxxx"
              {...register("keyId", { required: "Key ID required" })}
              className={errors.keyId ? "border-destructive" : ""}
            />
            {errors.keyId && <p className="text-xs text-destructive">{errors.keyId.message}</p>}
            <p className="text-xs text-muted-foreground">Starts with rzp_test_ (testing) or rzp_live_ (production)</p>
          </div>

          <div className="space-y-1.5">
            <Label>Razorpay Key Secret *</Label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                placeholder={hasSecret ? "••••••••••••••••••••" : "Enter new key secret"}
                className={`pr-10 ${errors.keySecret ? "border-destructive" : ""}`}
                {...register("keySecret", {
                  validate: (v) => {
                    if (!hasSecret && !v) return "Key Secret required";
                    return true;
                  }
                })}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.keySecret && <p className="text-xs text-destructive">{errors.keySecret.message}</p>}
            {hasSecret && <p className="text-xs text-muted-foreground">Leave empty to keep existing secret. Enter new value to update.</p>}
          </div>

          <Button type="submit" loading={saving} className="w-full">
            <CreditCard className="w-4 h-4" />
            Save Razorpay Keys
          </Button>
        </form>

        {/* Important note */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 space-y-1">
          <p className="font-semibold">Important:</p>
          <p>• Use <strong>Live keys</strong> for real payments from students</p>
          <p>• Use <strong>Test keys</strong> for development/testing only</p>
          <p>• Never share your Key Secret with anyone</p>
          <p>• Student payments go directly to your Razorpay account, not the platform</p>
        </div>
      </CardContent>
    </Card>
  );
}

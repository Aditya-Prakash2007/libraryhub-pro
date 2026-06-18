"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle2, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendOTP, verifyOTPAndReset } from "@/actions/auth";

type Step = "email" | "otp" | "password" | "done";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setLoading(true);
    const result = await sendOTP(email);
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("OTP sent to your email");
    setStep("otp");
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    const result = await verifyOTPAndReset(email, otp, "CHECK_ONLY");
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setStep("password");
  };

  // Step 3: Reset password
  const handleReset = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Include at least one uppercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error("Include at least one number");
      return;
    }
    setLoading(true);
    const result = await verifyOTPAndReset(email, otp, newPassword);
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setStep("done");
  };

  return (
    <AnimatePresence mode="wait">
      {/* Step 1: Email */}
      {step === "email" && (
        <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Forgot password?</h1>
            <p className="text-muted-foreground text-sm">Enter your email and we'll send you a 6-digit OTP.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={handleSendOTP} loading={loading}>
              Send OTP
            </Button>
          </div>
          <div className="mt-6 text-center">
            <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        </motion.div>
      )}

      {/* Step 2: OTP */}
      {step === "otp" && (
        <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Enter OTP</h1>
            <p className="text-muted-foreground text-sm">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
              It expires in <strong>10 minutes</strong>.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">6-Digit OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                autoFocus
              />
            </div>
            <Button className="w-full" size="lg" onClick={handleVerifyOTP} loading={loading}>
              Verify OTP
            </Button>
            <Button variant="ghost" className="w-full text-sm" onClick={() => { setStep("email"); setOtp(""); }}>
              Change email or resend
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3: New Password */}
      {step === "password" && (
        <motion.div key="password" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="mb-8">
            <div className="w-12 h-12 bg-indigo-500/15 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-indigo-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Set new password</h1>
            <p className="text-muted-foreground text-sm">OTP verified! Now set your new password.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
              />
            </div>
            <Button className="w-full" size="lg" onClick={handleReset} loading={loading}>
              Reset Password
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold mb-3">Password Reset!</h2>
          <p className="text-muted-foreground text-sm mb-6">Your password has been updated. You can now sign in with your new password.</p>
          <Button className="w-full" onClick={() => router.push("/login")}>
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

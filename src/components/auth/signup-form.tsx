"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Building2, UserPlus, CheckCircle2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupSchema } from "@/schemas";
import { registerLibraryAdmin } from "@/actions/auth";
import type { z } from "zod";

type SignupData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [libraryName, setLibraryName] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "", email: "", password: "", confirmPassword: "",
      libraryName: "", phone: "", agreeToTerms: false,
    },
  });

  const onSubmit = async (data: SignupData) => {
    setIsLoading(true);
    try {
      const result = await registerLibraryAdmin(data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setLibraryName(data.libraryName);
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold mb-3">Library Registered! 🎉</h2>
          <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
            <strong className="text-foreground">"{libraryName}"</strong> successfully registered.
            Your <strong className="text-indigo-400">48-hour free trial</strong> has started!
          </p>
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-left mb-6">
            <p className="text-sm font-semibold text-indigo-400 mb-2">Next steps:</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold shrink-0">1.</span>Login with "Library Owner" option</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold shrink-0">2.</span>Add seats and shifts</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold shrink-0">3.</span>Start adding students</li>
              <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold shrink-0">4.</span>Before 48hrs ends, purchase subscription</li>
            </ol>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">Register your library</h1>
            <p className="text-muted-foreground text-sm">Get started with LibraryHub Pro in minutes</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Library Name */}
            <div className="space-y-1.5">
              <Label htmlFor="libraryName">Library Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="libraryName"
                  placeholder="City Public Library"
                  className={`pl-9 ${errors.libraryName ? "border-destructive" : ""}`}
                  {...register("libraryName")}
                />
              </div>
              {errors.libraryName && <p className="text-xs text-destructive">{errors.libraryName.message}</p>}
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Your Full Name *</Label>
              <Input id="name" placeholder="Rahul Sharma" className={errors.name ? "border-destructive" : ""} {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" className={errors.email ? "border-destructive" : ""} {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" type="tel" placeholder="9876543210" className={errors.phone ? "border-destructive" : ""} {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  {...register("password")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input id="confirmPassword" type="password" placeholder="Repeat password" className={errors.confirmPassword ? "border-destructive" : ""} {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="agreeToTerms"
                className="mt-0.5 w-4 h-4 rounded accent-indigo-500"
                {...register("agreeToTerms")}
              />
              <Label htmlFor="agreeToTerms" className="text-sm font-normal leading-relaxed cursor-pointer">
                I agree to the{" "}
                <Link href="/terms" className="text-indigo-500 hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-indigo-500 hover:underline">Privacy Policy</Link>
              </Label>
            </div>
            {errors.agreeToTerms && <p className="text-xs text-destructive">{errors.agreeToTerms.message}</p>}

            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              {!isLoading && <UserPlus className="w-4 h-4" />}
              Register Library
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-500 hover:text-indigo-400 font-medium transition-colors">Sign in</Link>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

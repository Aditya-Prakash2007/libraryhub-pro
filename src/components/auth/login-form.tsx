"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, User, Building2, ArrowLeft, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginData = z.infer<typeof loginSchema>;

type LoginRole = "STUDENT" | "LIBRARY_ADMIN" | null;

const ERROR_MESSAGES: Record<string, string> = {
  suspended: "Your account has been suspended. Contact support.",
  unauthorized: "You don't have permission to access that page.",
  SUSPENDED: "Your account has been suspended. Contact support.",
  WRONG_ROLE: "This account doesn't match the selected role.",
  PENDING_APPROVAL: "Your library is awaiting Super Admin approval.",
  REJECTED: "Your library registration was rejected. Contact support.",
  CredentialsSignin: "Invalid email or password.",
};

export function LoginForm() {
  const [selectedRole, setSelectedRole] = useState<LoginRole>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const errorParam = searchParams.get("error");

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const handleRoleSelect = (role: LoginRole) => {
    setSelectedRole(role);
    reset();
  };

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        loginRole: selectedRole,
        redirect: false,
      });

      if (result?.error) {
        toast.error(ERROR_MESSAGES[result.error] ?? "Invalid credentials. Please try again.");
        return;
      }

      // Fetch session to determine redirect
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role;

      toast.success("Welcome back!");

      if (callbackUrl) {
        router.push(decodeURIComponent(callbackUrl));
      } else if (role === "SUPER_ADMIN") {
        router.push("/superadmin/dashboard");
      } else if (role === "LIBRARY_ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Error banner */}
      {errorParam && ERROR_MESSAGES[errorParam] && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{ERROR_MESSAGES[errorParam]}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {/* ── Step 1: Role Selection ── */}
        {!selectedRole ? (
          <motion.div
            key="role-select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
              <p className="text-muted-foreground text-sm">Choose how you want to log in</p>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-6">
              {/* Student */}
              <button
                type="button"
                onClick={() => handleRoleSelect("STUDENT")}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                  "hover:border-indigo-500 hover:bg-indigo-500/5 hover:shadow-lg hover:shadow-indigo-500/10",
                  "cursor-pointer group"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors shrink-0">
                  <User className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <p className="font-semibold">Student</p>
                  <p className="text-xs text-muted-foreground">View seat, attendance & pay fees</p>
                </div>
              </button>

              {/* Library Owner */}
              <button
                type="button"
                onClick={() => handleRoleSelect("LIBRARY_ADMIN")}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                  "hover:border-violet-500 hover:bg-violet-500/5 hover:shadow-lg hover:shadow-violet-500/10",
                  "cursor-pointer group"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors shrink-0">
                  <Building2 className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <p className="font-semibold">Library Owner</p>
                  <p className="text-xs text-muted-foreground">Manage students, seats & payments</p>
                </div>
              </button>

              {/* Super Admin */}
              <button
                type="button"
                onClick={() => handleRoleSelect("LIBRARY_ADMIN")}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all duration-200 text-left",
                  "hover:border-amber-500/60 hover:bg-amber-500/5",
                  "cursor-pointer group"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors shrink-0">
                  <Shield className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold">Super Admin</p>
                  <p className="text-xs text-muted-foreground">Platform management & approvals</p>
                </div>
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-indigo-500 hover:text-indigo-400 font-medium transition-colors">
                  Register Library
                </Link>
              </p>
            </div>
          </motion.div>

        ) : (
          /* ── Step 2: Credentials Form ── */
          <motion.div
            key="login-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Role indicator + back */}
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                selectedRole === "STUDENT"
                  ? "bg-indigo-500/10 text-indigo-500"
                  : "bg-violet-500/10 text-violet-500"
              )}>
                {selectedRole === "STUDENT" ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                {selectedRole === "STUDENT" ? "Student Login" : "Library Owner Login"}
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Sign in</h1>
              <p className="text-muted-foreground text-sm">
                {selectedRole === "STUDENT"
                  ? "Enter your student credentials"
                  : "Enter your library admin credentials"}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  className={errors.email ? "border-destructive" : ""}
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={cn("pr-10", errors.password ? "border-destructive" : "")}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                {!isLoading && <LogIn className="w-4 h-4" />}
                Sign In
              </Button>
            </form>

            {selectedRole === "LIBRARY_ADMIN" && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-indigo-500 hover:text-indigo-400 font-medium transition-colors">
                    Register your library
                  </Link>
                </p>
              </div>
            )}

        {/* Demo credentials */}
            <div className="mt-5 p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Demo credentials:</p>
              {selectedRole === "STUDENT" ? (
                <p className="text-xs text-muted-foreground font-mono">student@demolibrary.com / Student@123</p>
              ) : (
                <div className="space-y-1 text-xs text-muted-foreground font-mono">
                  <p>admin@demolibrary.com / Admin@123</p>
                  <p className="text-[10px]">superadmin@libraryhub.com / SuperAdmin@123</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

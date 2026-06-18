// Auth layout - centered card with gradient background
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-background to-violet-500/5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

      {/* Logo */}
      <div className="relative mb-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">LibraryHub Pro</span>
        </Link>
      </div>

      {/* Auth card */}
      <div className="relative w-full max-w-md px-4">
        <div className="bg-card border border-border/50 rounded-2xl shadow-2xl p-8">
          {children}
        </div>
      </div>

      <p className="relative mt-6 text-sm text-muted-foreground">
        © 2024 LibraryHub Pro. All rights reserved.
      </p>
    </div>
  );
}

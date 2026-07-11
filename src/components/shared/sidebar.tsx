"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Grid3X3, Clock, CreditCard,
  CalendarCheck, BarChart3, Bell, Settings, BookOpen,
  ChevronLeft, Building2, LogOut, User, Zap, QrCode, Briefcase, MessageSquare, Receipt,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getInitials } from "@/lib/utils";
import { ADMIN_NAV_ITEMS, STUDENT_NAV_ITEMS, SUPERADMIN_NAV_ITEMS } from "@/constants";

const iconMap = {
  LayoutDashboard, Users, Grid3X3, Clock, CreditCard,
  CalendarCheck, BarChart3, Bell, Settings, Building2, User, QrCode, Zap, Briefcase, MessageSquare, Receipt,
};

interface SidebarProps {
  role: "LIBRARY_ADMIN" | "STUDENT" | "SUPER_ADMIN";
  libraryName?: string;
}

export function Sidebar({ role, libraryName }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems =
    role === "LIBRARY_ADMIN"
      ? ADMIN_NAV_ITEMS
      : role === "STUDENT"
      ? STUDENT_NAV_ITEMS
      : SUPERADMIN_NAV_ITEMS;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 72 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 h-full z-40 flex flex-col",
          "bg-card border-r border-border/50",
          "overflow-hidden",
          // Mobile: overlay; Desktop: static
          "lg:relative lg:translate-x-0",
          !sidebarOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border/50 shrink-0">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="font-bold text-sm gradient-text truncate">LibraryHub Pro</p>
                  {libraryName && (
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">{libraryName}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto shrink-0 w-7 h-7"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          <TooltipProvider delayDuration={0}>
            {navItems.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                        isActive
                          ? "bg-indigo-500/15 text-indigo-500 dark:text-indigo-400"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Icon
                          className={cn(
                            "w-5 h-5 transition-transform group-hover:scale-110",
                            isActive ? "text-indigo-500" : ""
                          )}
                        />
                        {isActive && (
                          <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500 rounded-r-full" />
                        )}
                      </div>
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="truncate"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right">
                      {item.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* User profile at bottom */}
        <div className="border-t border-border/50 p-3 shrink-0">
          <div className={cn("flex items-center gap-3 rounded-lg p-2", sidebarOpen && "hover:bg-accent cursor-pointer")}>
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="text-xs">
                {getInitials(session?.user?.name || "U")}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

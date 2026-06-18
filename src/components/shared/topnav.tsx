"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import {
  Menu, Sun, Moon, Bell, Search, ChevronDown,
  User, LogOut, Settings, Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/use-app-store";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

interface TopNavProps {
  title?: string;
}

export function TopNav({ title }: TopNavProps) {
  const { toggleSidebar, unreadNotificationCount, setCommandMenuOpen } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const settingsHref =
    role === "LIBRARY_ADMIN" ? "/admin/settings" :
    role === "STUDENT" ? "/student/profile" :
    "/superadmin/settings";

  const profileHref =
    role === "STUDENT" ? "/student/profile" :
    role === "LIBRARY_ADMIN" ? "/admin/settings" :
    "/superadmin/settings";

  const notificationsHref =
    role === "STUDENT" ? "/student/notifications" :
    "/admin/notifications";

  return (
    <header className="h-16 flex items-center gap-4 px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-20">
      {/* Sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Page title - hidden on mobile */}
      {title && (
        <h1 className="hidden md:block text-lg font-semibold truncate">{title}</h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search button */}
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex items-center gap-2 text-muted-foreground w-48 lg:w-64 justify-start"
        onClick={() => setCommandMenuOpen(true)}
      >
        <Search className="w-4 h-4" />
        <span className="text-sm">Search...</span>
        <div className="ml-auto flex items-center gap-1">
          <kbd className="text-xs bg-muted rounded px-1">⌘K</kbd>
        </div>
      </Button>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative" asChild>
        <Link href={notificationsHref} aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
            </span>
          )}
        </Link>
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="text-xs">
                {getInitials(session?.user?.name || "U")}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
              {session?.user?.name?.split(" ")[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{session?.user?.name}</span>
              <span className="text-xs text-muted-foreground font-normal truncate">
                {session?.user?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={profileHref} className="cursor-pointer">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={settingsHref} className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

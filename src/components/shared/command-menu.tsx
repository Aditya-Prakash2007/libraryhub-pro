"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, Grid3X3, Clock, CreditCard,
  CalendarCheck, BarChart3, Bell, Settings, Building2,
  LogOut,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { signOut } from "next-auth/react";
import { ADMIN_NAV_ITEMS, STUDENT_NAV_ITEMS, SUPERADMIN_NAV_ITEMS } from "@/constants";

const iconMap = {
  LayoutDashboard, Users, Grid3X3, Clock, CreditCard,
  CalendarCheck, BarChart3, Bell, Settings, Building2,
};

export function CommandMenu() {
  const { commandMenuOpen, setCommandMenuOpen } = useAppStore();
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role;

  // ⌘K shortcut
  useKeyboardShortcut(
    { key: "k", modifiers: ["meta"] },
    () => setCommandMenuOpen(true)
  );
  useKeyboardShortcut(
    { key: "k", modifiers: ["ctrl"] },
    () => setCommandMenuOpen(true)
  );

  const navItems =
    role === "LIBRARY_ADMIN" ? ADMIN_NAV_ITEMS :
    role === "STUDENT" ? STUDENT_NAV_ITEMS :
    SUPERADMIN_NAV_ITEMS;

  const navigate = (href: string) => {
    router.push(href);
    setCommandMenuOpen(false);
  };

  return (
    <CommandDialog open={commandMenuOpen} onOpenChange={setCommandMenuOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard;
            return (
              <CommandItem
                key={item.href}
                onSelect={() => navigate(item.href)}
                className="cursor-pointer"
              >
                <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
                {item.title}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {role === "LIBRARY_ADMIN" && (
            <>
              <CommandItem onSelect={() => navigate("/admin/students?action=add")} className="cursor-pointer">
                <Users className="w-4 h-4 mr-2 text-indigo-500" />
                Add New Student
              </CommandItem>
              <CommandItem onSelect={() => navigate("/admin/attendance")} className="cursor-pointer">
                <CalendarCheck className="w-4 h-4 mr-2 text-emerald-500" />
                Mark Attendance
              </CommandItem>
              <CommandItem onSelect={() => navigate("/admin/payments?action=add")} className="cursor-pointer">
                <CreditCard className="w-4 h-4 mr-2 text-amber-500" />
                Record Payment
              </CommandItem>
            </>
          )}
          <CommandItem
            onSelect={() => { signOut({ callbackUrl: "/login" }); setCommandMenuOpen(false); }}
            className="cursor-pointer text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

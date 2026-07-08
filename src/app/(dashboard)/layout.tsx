import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { TopNav } from "@/components/shared/topnav";
import { CommandMenu } from "@/components/shared/command-menu";
import { SubscriptionGuard } from "@/components/dashboard/subscription-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as "LIBRARY_ADMIN" | "STUDENT" | "SUPER_ADMIN";
  // Library name comes from session — no extra DB call needed
  const libraryName = (session.user as any).libraryName as string | undefined;

  // For LIBRARY_ADMIN wrap in subscription guard
  const mainContent = (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={role} libraryName={libraryName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <CommandMenu />
    </div>
  );

  if (role === "LIBRARY_ADMIN") {
    return (
      <SubscriptionGuard>
        {mainContent}
      </SubscriptionGuard>
    );
  }

  return mainContent;
}

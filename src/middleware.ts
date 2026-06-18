// Middleware - Route Protection & Role-Based Access Control
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export default auth(function middleware(req) {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.role;
  const userStatus = session?.user?.status;

  const isPublicRoute =
    publicRoutes.some((route) => nextUrl.pathname === route) ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/webhooks") ||
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/icons") ||
    nextUrl.pathname.startsWith("/images") ||
    nextUrl.pathname === "/favicon.ico" ||
    nextUrl.pathname === "/manifest.json";

  if (isPublicRoute) {
    if (isLoggedIn && ["/login", "/signup"].includes(nextUrl.pathname)) {
      return NextResponse.redirect(
        new URL(getRedirectPath(userRole), nextUrl)
      );
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  if (userStatus === "SUSPENDED") {
    return NextResponse.redirect(
      new URL("/login?error=suspended", nextUrl)
    );
  }

  if (
    nextUrl.pathname.startsWith("/superadmin") &&
    userRole !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(
      new URL("/login?error=unauthorized", nextUrl)
    );
  }

  if (
    nextUrl.pathname.startsWith("/admin") &&
    userRole !== "LIBRARY_ADMIN" &&
    userRole !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(
      new URL("/login?error=unauthorized", nextUrl)
    );
  }

  if (
    nextUrl.pathname.startsWith("/student") &&
    userRole !== "STUDENT"
  ) {
    return NextResponse.redirect(
      new URL(getRedirectPath(userRole), nextUrl)
    );
  }

  return NextResponse.next();
} as Parameters<typeof auth>[0]);

function getRedirectPath(role: string | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/superadmin/dashboard";
    case "LIBRARY_ADMIN":
      return "/admin/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    default:
      return "/login";
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json).*)"],
};

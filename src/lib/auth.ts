// NextAuth v5 Configuration — 30-day sessions
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 24 * 60 * 60, // Refresh every 24 hours
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_MAX_AGE,
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginRole: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            library: {
              select: { id: true, name: true, slug: true, isActive: true, isSuspended: true, approvalStatus: true },
            },
            student: {
              select: { id: true, studentId: true, libraryId: true, status: true },
            },
          },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) return null;

        if (user.status === "SUSPENDED") {
          throw new Error("SUSPENDED");
        }

        // Role validation against selected role
        const loginRole = credentials.loginRole as string;
        // Super Admin can always login regardless of role selection
        if (user.role === "SUPER_ADMIN") {
          // Super admin bypasses role check
        } else if (loginRole === "STUDENT" && user.role !== "STUDENT") {
          throw new Error("WRONG_ROLE");
        } else if (loginRole === "LIBRARY_ADMIN" && user.role !== "LIBRARY_ADMIN") {
          throw new Error("WRONG_ROLE");
        }

        // Library admin approval check (skip for super admin)
        if (user.role === "LIBRARY_ADMIN") {
          const approvalStatus = user.library?.approvalStatus;
          if (approvalStatus === "PENDING") throw new Error("PENDING_APPROVAL");
          if (approvalStatus === "REJECTED") throw new Error("REJECTED");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role as string,
          status: user.status as string,
          libraryId: user.library?.id ?? user.student?.libraryId ?? null,
          studentId: user.student?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.status = (user as { status: string }).status;
        token.libraryId = (user as { libraryId: string | null }).libraryId;
        token.studentId = (user as { studentId: string | null }).studentId;
      }
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.libraryId = token.libraryId as string | null;
        session.user.studentId = token.studentId as string | null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            type: "USER_LOGIN",
            description: `User ${user.email} logged in`,
          },
        }).catch(() => {}); // Non-blocking
      }
    },
  },
});

// NextAuth Type Extensions
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      status: string;
      libraryId: string | null;
      studentId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    status: string;
    libraryId: string | null;
    studentId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    status: string;
    libraryId: string | null;
    studentId: string | null;
  }
}

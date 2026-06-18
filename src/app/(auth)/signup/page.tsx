import { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your LibraryHub Pro account",
};

export default function SignupPage() {
  return <SignupForm />;
}

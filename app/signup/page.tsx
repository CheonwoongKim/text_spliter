import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "회원가입 | BGK",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}

import type { Metadata } from "next";
import { AuthCard } from "@/components/admin/AuthCard";
import { ForgotPasswordForm } from "@/components/admin/PasswordResetForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot your password?" intro="Enter the email you sign in with. We'll email you a link to choose a new password.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}

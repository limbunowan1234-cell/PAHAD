import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/admin/AuthCard";
import { ResetPasswordForm } from "@/components/admin/PasswordResetForms";

export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" intro="This link works once, for 30 minutes.">
      <Suspense fallback={<div className="mt-8 h-56" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}

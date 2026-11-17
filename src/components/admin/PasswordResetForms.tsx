"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { requestPasswordReset, resetPassword } from "@/app/admin/password-reset-actions";
import type { ActionState } from "@/lib/admin-helpers";

function Message({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={state.ok ? "rounded-xl bg-sage-100 p-3 text-sm text-teal" : "rounded-xl bg-red-50 p-3 text-sm text-red-800"}>
      {state.message}
    </p>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(requestPasswordReset, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <Message state={state} />
      <button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send reset link
      </button>
      <p className="text-xs text-muted">No email? The President can also reset your password from Admin Team.</p>
    </form>
  );
}

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState<ActionState, FormData>(resetPassword, null);
  if (state?.ok) {
    return (
      <div className="mt-8 space-y-4">
        <Message state={state} />
        <Link href="/admin/login" className="btn btn-primary w-full">Sign in</Link>
      </div>
    );
  }
  if (!token) return <p className="mt-8 rounded-xl bg-red-50 p-3 text-sm text-red-800">This link is incomplete. Open the link from your email again, or <Link href="/admin/forgot-password" className="underline">ask for a new one</Link>.</p>;
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="label">New password</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
        <span className="mt-1 block text-xs text-muted">At least 10 characters, with letters and numbers.</span>
      </label>
      <label className="block">
        <span className="label">Type it again</span>
        <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </label>
      <Message state={state} />
      {state && !state.ok && /expired|invalid/.test(state.message) && (
        <Link href="/admin/forgot-password" className="block text-sm text-teal underline">Ask for a new link</Link>
      )}
      <button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Change password
      </button>
    </form>
  );
}

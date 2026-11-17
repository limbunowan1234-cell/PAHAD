"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { login, type ActionState } from "../actions";
import { keepValuesOnSubmit } from "@/lib/use-form-submit";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, null);
  const next = useSearchParams().get("next") ?? "";
  return (
    <form method="post" onSubmit={keepValuesOnSubmit(action)} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <label className="block">
        <span className="flex items-center justify-between">
          <span className="label">Password</span>
          <Link href="/admin/forgot-password" className="text-xs font-semibold text-teal hover:underline">Forgot password?</Link>
        </span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      {state && !state.ok && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.message}</p>
      )}
      <button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Sign in
      </button>
    </form>
  );
}

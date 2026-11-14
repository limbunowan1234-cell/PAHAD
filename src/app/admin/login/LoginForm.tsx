"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login, type ActionState } from "../actions";
import { keepValuesOnSubmit } from "@/lib/use-form-submit";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, null);
  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="mt-8 space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <label className="block">
        <span className="label">Password</span>
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

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { keepValuesOnSubmit } from "@/lib/use-form-submit";
import { CheckCircle2, Loader2 } from "lucide-react";
import { applyForMembership, submitInquiry, type FormState } from "@/app/actions/public";
import type { SubmissionKind } from "@/lib/types";

function Field({ label, name, error, required, children }: { label: string; name: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-coral-700" aria-hidden>*</span>}
      </label>
      {children}
      {error && <p id={`${name}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function Honeypot() {
  return (
    <div aria-hidden className="absolute left-[-9999px]">
      <label>
        Website <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

function Success({ message }: { message: string }) {
  return (
    <div role="status" className="rounded-[var(--radius-card)] bg-sage-100 p-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-teal" aria-hidden />
      <p className="mt-4 text-lg font-medium text-teal">{message}</p>
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60 sm:w-auto">
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const err = (s: FormState, k: string) => s?.errors?.[k];
const aria = (s: FormState, k: string) => (s?.errors?.[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

export function InquiryForm({ defaultKind = "contact", showKind = true }: { defaultKind?: SubmissionKind; showKind?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitInquiry, null);
  if (state?.ok) return <Success message={state.message} />;
  return (
    <form method="post" onSubmit={keepValuesOnSubmit(action)} className="relative space-y-5" noValidate>
      <Honeypot />
      {state && !state.ok && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.message}</p>}
      {showKind ? (
        <Field label="What is this about?" name="kind" required error={err(state, "kind")}>
          <select id="kind" name="kind" defaultValue={defaultKind} className="field">
            <option value="contact">General enquiry</option>
            <option value="idea">Share an idea or local need</option>
            <option value="volunteer">Volunteer my time or skills</option>
            <option value="collaborate">Collaboration or partnership</option>
            <option value="knowledge">Contribute knowledge or documentation</option>
          </select>
        </Field>
      ) : (
        <input type="hidden" name="kind" value={defaultKind} />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required error={err(state, "name")}>
          <input id="name" name="name" autoComplete="name" className="field" {...aria(state, "name")} />
        </Field>
        <Field label="Email" name="email" required error={err(state, "email")}>
          <input id="email" name="email" type="email" autoComplete="email" className="field" {...aria(state, "email")} />
        </Field>
        <Field label="Phone (optional)" name="phone">
          <input id="phone" name="phone" type="tel" autoComplete="tel" className="field" />
        </Field>
        <Field label="Organisation (optional)" name="organisation">
          <input id="organisation" name="organisation" autoComplete="organization" className="field" />
        </Field>
      </div>
      <Field label="Message" name="message" required error={err(state, "message")}>
        <textarea id="message" name="message" rows={5} className="field" {...aria(state, "message")} />
      </Field>
      <p className="text-xs text-muted">
        Please don’t include passwords, identity numbers or other sensitive details. See our <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
      <Submit pending={pending}>Send message</Submit>
    </form>
  );
}


/** `interests`: the editable "Areas you'd like to contribute to" list (Admin → Members). */
export function MembershipForm({ interests }: { interests: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(applyForMembership, null);
  if (state?.ok) return <Success message={state.message} />;
  return (
    <form method="post" onSubmit={keepValuesOnSubmit(action)} className="relative space-y-6" noValidate>
      <Honeypot />
      {state && !state.ok && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.message}</p>}
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-xl text-teal">About you</legend>
        <Field label="Full name" name="name" required error={err(state, "name")}>
          <input id="name" name="name" autoComplete="name" className="field" {...aria(state, "name")} />
        </Field>
        <Field label="Email" name="email" required error={err(state, "email")}>
          <input id="email" name="email" type="email" autoComplete="email" className="field" {...aria(state, "email")} />
        </Field>
        <Field label="Phone / WhatsApp" name="phone" required error={err(state, "phone")}>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className="field" {...aria(state, "phone")} />
        </Field>
        <Field label="Town / area" name="area" required error={err(state, "area")}>
          <input id="area" name="area" placeholder="e.g. Darjeeling, Kalimpong, Siliguri" className="field" {...aria(state, "area")} />
        </Field>
        <Field label="Occupation or field (optional)" name="occupation">
          <input id="occupation" name="occupation" className="field" />
        </Field>
        <Field label="I am applying as" name="category">
          <select id="category" name="category" className="field" defaultValue="General">
            <option>General</option>
            <option>Student / Youth</option>
            <option>Professional</option>
            <option>Former DSSCOLONY member</option>
            <option>Institution representative</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Postal address (optional)" name="address">
            <input id="address" name="address" autoComplete="street-address" className="field" />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-display text-xl text-teal">Areas you’d like to contribute to</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {interests.map((i) => (
            <label key={i} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm hover:bg-sand">
              <input type="checkbox" name="interests" value={i} className="h-4 w-4 accent-teal" /> {i}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Why would you like to join? (optional)" name="motivation">
        <textarea id="motivation" name="motivation" rows={4} className="field" />
      </Field>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-teal" {...aria(state, "consent")} />
          <span>
            I confirm the information is accurate and agree to the <Link href="/terms" className="underline">terms</Link> and{" "}
            <Link href="/privacy" className="underline">privacy notice</Link>. I understand that applying does not automatically confirm membership.
          </span>
        </label>
        {err(state, "consent") && <p id="consent-error" className="mt-1 text-sm text-red-700">{err(state, "consent")}</p>}
      </div>
      <Submit pending={pending}>Submit application</Submit>
    </form>
  );
}

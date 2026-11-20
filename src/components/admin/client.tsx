"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  Activity, Bell, Clapperboard, Languages, ListTree, Sparkles, Vote, CheckSquare, FileText, Gavel, Handshake, IdCard, Image as ImageIcon, Images, Inbox, LayoutDashboard, Loader2, LogOut, Megaphone, Menu, Network, Wallet,
  ShieldCheck, UserCircle, Users, X,
} from "lucide-react";
import type { ActionState } from "@/app/admin/actions";
import { keepValuesOnSubmit } from "@/lib/use-form-submit";
import { InstallAppButton } from "@/components/site/InstallApp";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------ sidebar
const ICONS = { dashboard: LayoutDashboard, notifications: Bell, finance: Wallet, content: FileText, members: Users, tasks: CheckSquare, submissions: Inbox, gallery: ImageIcon, heroes: Images, people: IdCard, structure: Network, meetings: Gavel, circulars: Megaphone, partners: Handshake, videos: Clapperboard, featured: Sparkles, menu: ListTree, translations: Languages, voting: Vote, team: ShieldCheck, activity: Activity, account: UserCircle };
export type NavKey = keyof typeof ICONS;

export function AdminNav({
  items,
  user,
  logoutAction,
}: {
  items: { key: NavKey; label: string; href: string; badge?: number }[];
  user: { name: string; roleLabel: string };
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  // The mobile menu is "open at" a path, so navigating anywhere closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (fn: (v: boolean) => boolean) => setOpenAt(fn(open) ? pathname : null);

  const list = (
    <nav aria-label="Admin" className="space-y-1">
      {items.map(({ key, label, href, badge }) => {
        const Icon = ICONS[key];
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-white text-teal shadow-sm" : "text-white/85 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            <span className="flex-1">{label}</span>
            {!!badge && <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-ink">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/15 pt-4">
      <p className="truncate text-sm font-semibold text-white">{user.name}</p>
      <p className="text-xs text-cream">{user.roleLabel}</p>
      <InstallAppButton label="Install admin app" apk="/downloads/PAHAD-Admin.apk" apkClassName="text-cream" className="mt-3 text-sm text-cream hover:text-white" />
      <form action={logoutAction}>
        <button className="mt-3 flex items-center gap-2 text-sm text-white/80 hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-3">
      <Image src="/images/emblem.png" alt="" width={40} height={40} />
      <span>
        <span className="block font-display text-lg font-semibold text-white">PAHAD</span>
        <span className="block text-[11px] uppercase tracking-[0.14em] text-cream">Admin</span>
      </span>
    </Link>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 bg-teal-900 p-5 lg:flex">
        {brand}
        <div className="flex-1 overflow-y-auto">{list}</div>
        {footer}
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-teal-900 px-4 py-3 lg:hidden">
        {brand}
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="rounded-lg p-2 text-white">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[64px] z-40 flex flex-col gap-6 overflow-y-auto bg-teal-900 p-5 lg:hidden">
          {list}
          {footer}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ forms
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  resetOnSuccess = false,
  className,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      router.refresh();
    }
  }, [state, resetOnSuccess, router]);
  return (
    <form ref={ref} method="post" onSubmit={keepValuesOnSubmit(formAction)} className={cn("space-y-4", className)}>
      {children}
      {state && (
        <p role={state.ok ? "status" : "alert"} className={cn("rounded-xl p-3 text-sm", state.ok ? "bg-sage-100 text-teal" : "bg-red-50 text-red-800")}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitLabel}
      </button>
    </form>
  );
}

export function ActionButton({
  action,
  children,
  confirm,
  variant = "ghost",
  className,
}: {
  action: () => Promise<ActionState>;
  children: ReactNode;
  confirm?: string;
  variant?: "ghost" | "danger" | "primary";
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const res = await action();
            setMsg(res?.ok ? null : res);
            router.refresh();
          });
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50",
          variant === "danger" && "text-red-700 hover:bg-red-50",
          variant === "ghost" && "text-teal hover:bg-sand",
          variant === "primary" && "bg-teal text-white hover:bg-teal-900",
          className,
        )}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
        {children}
      </button>
      {msg && !msg.ok && <span className="mt-1 text-xs text-red-700">{msg.message}</span>}
    </span>
  );
}

export function Disclosure({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-line bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-teal marker:hidden">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
        {summary}
      </summary>
      <div className="border-t border-line p-5">{children}</div>
    </details>
  );
}

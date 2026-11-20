import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlusNav, PlusNavView } from "@/components/plus/client";

export const metadata: Metadata = {
  title: { default: "PAHAD+ | Events, places, business and briefs from the hills", template: "%s | PAHAD+" },
  description: "The community app for Darjeeling, Kalimpong, Siliguri and Sikkim: events, places to roam, local businesses, alerts, jobs and opportunities. By PAHAD.",
  applicationName: "PAHAD+",
  manifest: "/plus.webmanifest",
  icons: { icon: "/icons/plus-192.png", apple: "/icons/plus-apple-180.png" },
  appleWebApp: { capable: true, title: "PAHAD+", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#164d58", viewportFit: "cover" };

/** PAHAD+ has its own app shell: a slim top bar and, on phones, a bottom tab bar. */
export default function PlusLayout({ children }: LayoutProps<"/plus">) {
  return (
    <div className="flex min-h-screen flex-col bg-sand">
      <a href="#plus-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 bg-teal pt-[env(safe-area-inset-top)] text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/plus" className="flex items-center gap-2 font-display text-xl font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-coral text-lg font-bold text-ink" aria-hidden>+</span>
            PAHAD+
          </Link>
          <Suspense fallback={<PlusNavView variant="top" pathname="" />}><PlusNav variant="top" /></Suspense>
        </div>
      </header>
      <main id="plus-main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 md:pb-12">
        {children}
      </main>
      <footer className="hidden border-t border-line bg-white py-6 text-center text-xs text-muted md:block">
        PAHAD+ is run by <Link href="/" className="underline">PAHAD</Link> ·{" "}
        <Link href="/plus/terms" className="underline">Terms &amp; community guidelines</Link> ·{" "}
        <Link href="/privacy#pahad-plus" className="underline">Privacy</Link> ·{" "}
        <Link href="/plus/delete-account" className="underline">Delete account</Link>
      </footer>
      <Suspense fallback={<PlusNavView variant="bottom" pathname="" />}><PlusNav variant="bottom" /></Suspense>
    </div>
  );
}

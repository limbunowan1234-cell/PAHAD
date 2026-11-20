import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { PlusNav, PlusNavView, PlusSplash, PlusTopBar, PlusTopBarView } from "@/components/plus/client";
import { db } from "@/lib/db";
import { canModeratePlus } from "@/lib/plus/access";
import { getPlusUser } from "@/lib/plus/session";
import { appAdmin } from "@/lib/plus/app-admin";

export const metadata: Metadata = {
  title: { default: "PAHAD+ | Events & Entertainment from the hills", template: "%s | PAHAD+" },
  description: "The community app for Darjeeling, Kalimpong, Siliguri and Sikkim: events and entertainment, places to roam, local businesses, alerts, jobs and opportunities. By PAHAD.",
  applicationName: "PAHAD+",
  manifest: "/plus.webmanifest",
  icons: { icon: "/icons/plus-192.png", apple: "/icons/plus-apple-180.png" },
  appleWebApp: { capable: true, title: "PAHAD+", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#11181B", viewportFit: "cover", colorScheme: "dark" };

/** Bottom bar with the viewer's unread notifications, and the Desk tab for PAHAD admins (dashboard sign-in or Admin mode). */
async function Nav() {
  const [viewer, admin] = await Promise.all([getPlusUser(), appAdmin()]);
  const unread = viewer ? (await db.findBy("plus_notifications", "user_id", viewer.id)).filter((n) => !n.read).length : 0;
  return <PlusNav unread={unread} desk={Boolean(admin && (canModeratePlus(admin) || admin.role === "sysadmin"))} />;
}

/** PAHAD+ app shell: dark theme, one phone-width column (centred on larger screens), top bar and bottom bar. */
export default function PlusLayout({ children }: LayoutProps<"/plus">) {
  return (
    <div className="plus-dark min-h-dvh bg-[#0d1315]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-sand md:shadow-[0_24px_70px_rgba(9,14,16,0.72)]">
        <PlusSplash />
        <a href="#plus-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
          Skip to content
        </a>
        <Suspense fallback={<PlusTopBarView />}><PlusTopBar /></Suspense>
        <main id="plus-main" className="flex-1 px-4 pb-28 pt-4">{children}</main>
        <Suspense fallback={<PlusNavView pathname="" unread={0} desk={false} />}><Nav /></Suspense>
      </div>
    </div>
  );
}

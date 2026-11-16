import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · PAHAD Admin" },
  robots: { index: false, follow: false },
  // A separate installable app that opens straight into the admin panel.
  manifest: "/admin.webmanifest",
  icons: { icon: "/icons/admin-192.png", apple: "/icons/admin-apple-180.png" },
  appleWebApp: { capable: true, title: "PAHAD Admin", statusBarStyle: "black-translucent" },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-sand">{children}</div>;
}

import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap", axes: ["opsz"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name}: ${site.fullName}`,
    description: site.description,
    images: [{ url: "/images/hero.jpg", width: 1960, height: 1103, alt: "Kanchenjunga at sunrise above Darjeeling" }],
  },
  twitter: { card: "summary_large_image", site: "@PAHAD_official" },
  icons: { icon: "/icon.svg", apple: "/icons/pahad-apple-180.png" },
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "PAHAD", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#164d58" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

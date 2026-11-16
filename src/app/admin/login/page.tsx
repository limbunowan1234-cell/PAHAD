import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { InstallAppButton } from "@/components/site/InstallApp";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-teal-950 lg:block">
        <Image src="/images/hero.jpg" alt="" fill priority sizes="50vw" className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950 to-transparent" />
        <div className="absolute bottom-0 p-12 text-white">
          <p className="font-display text-4xl">People. Knowledge. Action.</p>
          <p className="mt-3 max-w-md text-white/80">PAHAD administration: content, members, tasks and messages in one place.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/emblem.png" alt="" width={52} height={52} />
            <span>
              <span className="block font-display text-2xl font-semibold text-teal">PAHAD</span>
              <span className="block text-xs uppercase tracking-[0.14em] text-muted">Admin sign in</span>
            </span>
          </Link>
          <h1 className="mt-10 text-3xl font-medium text-teal">Welcome back</h1>
          <p className="mt-1 text-muted">Sign in with the account a Super Admin created for you.</p>
          <LoginForm />
          <InstallAppButton label="Install admin app" className="mt-6 w-full rounded-full border border-line py-2.5 text-sm font-semibold text-teal hover:bg-sand" />
          <Link href="/" className="mt-6 block text-sm text-muted hover:text-teal">← Back to the website</Link>
        </div>
      </div>
    </div>
  );
}

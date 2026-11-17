import Image from "next/image";
import Link from "next/link";

/** Small centred card for the sign-in helpers (forgot / reset password). */
export function AuthCard({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/images/emblem.png" alt="" width={52} height={52} />
          <span>
            <span className="block font-display text-2xl font-semibold text-teal">PAHAD</span>
            <span className="block text-xs uppercase tracking-[0.14em] text-muted">Dashboard</span>
          </span>
        </Link>
        <h1 className="mt-10 text-3xl font-medium text-teal">{title}</h1>
        <p className="mt-1 text-muted">{intro}</p>
        {children}
        <Link href="/admin/login" className="mt-6 block text-sm text-muted hover:text-teal">← Back to sign in</Link>
      </div>
    </div>
  );
}

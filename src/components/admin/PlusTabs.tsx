import Link from "next/link";
import { canModeratePlus } from "@/lib/plus/access";
import { canView } from "@/lib/permissions";
import type { PublicUser } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Sub-navigation for the PAHAD+ part of the dashboard; each tab shows only to those who may open it. */
export function PlusTabs({ user, active }: { user: PublicUser; active: "queue" | "accounts" | "insights" | "payments" }) {
  const sys = user.role === "sysadmin";
  const tabs = [
    { key: "queue", label: "Queue", href: "/admin/plus", show: canModeratePlus(user) || sys },
    { key: "accounts", label: "Accounts", href: "/admin/plus/accounts", show: canModeratePlus(user) || sys },
    { key: "insights", label: "Insights", href: "/admin/plus/insights", show: canModeratePlus(user) || sys },
    { key: "payments", label: "Payments", href: "/admin/plus/payments", show: canView(user.role, "plus.payments") },
  ].filter((t) => t.show);
  return (
    <nav aria-label="PAHAD+" className="mb-6 flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}
          className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-semibold", t.key === active ? "border-teal text-teal" : "border-transparent text-muted hover:text-teal")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

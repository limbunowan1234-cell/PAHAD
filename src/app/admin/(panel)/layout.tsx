import { Suspense } from "react";
import { logout } from "../actions";
import { AdminNav, type NavKey } from "@/components/admin/client";
import { requireUser } from "@/lib/auth/session";
import { db, usingPostgres } from "@/lib/db";
import { can, financeAccess, roleLabel, type Permission } from "@/lib/permissions";
import { usingCloudStorage } from "@/lib/storage";

const NAV: { key: NavKey; label: string; href: string; perm: Permission }[] = [
  { key: "dashboard", label: "Dashboard", href: "/admin", perm: "dashboard.view" },
  { key: "notifications", label: "Notifications", href: "/admin/notifications", perm: "dashboard.view" },
  { key: "content", label: "Content", href: "/admin/content", perm: "content.view" },
  { key: "members", label: "Members", href: "/admin/members", perm: "members.view" },
  { key: "tasks", label: "Tasks", href: "/admin/tasks", perm: "tasks.view_own" },
  { key: "submissions", label: "Messages", href: "/admin/submissions", perm: "submissions.view" },
  { key: "gallery", label: "Gallery", href: "/admin/gallery", perm: "media.upload" },
  { key: "people", label: "Our Team", href: "/admin/people", perm: "people.manage" },
  { key: "heroes", label: "Page Images", href: "/admin/page-images", perm: "site.images" },
  { key: "partners", label: "Partners", href: "/admin/partners", perm: "partners.manage" },
  { key: "finance", label: "Finance", href: "/admin/finance", perm: "dashboard.view" },
  { key: "meetings", label: "GB Meetings", href: "/admin/meetings", perm: "gbm.view" },
  { key: "circulars", label: "Circulars", href: "/admin/circulars", perm: "circulars.view" },
  { key: "structure", label: "Structure", href: "/admin/structure", perm: "structure.view" },
  { key: "team", label: "Admin Team", href: "/admin/team", perm: "team.view" },
  { key: "activity", label: "Activity Log", href: "/admin/activity", perm: "activity.view" },
  { key: "account", label: "My Account", href: "/admin/account", perm: "dashboard.view" },
];

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [tasks, submissions, posts, members, notes, finance] = await Promise.all([
    db.findBy("tasks", "assigned_to", user.id),
    can(user.role, "submissions.view") ? db.findBy("submissions", "status", "new") : Promise.resolve([]),
    can(user.role, "content.publish") ? db.findBy("posts", "status", "pending") : Promise.resolve([]),
    can(user.role, "members.approve") ? db.findBy("members", "status", "applicant") : Promise.resolve([]),
    db.findBy("notifications", "user_id", user.id),
    financeAccess(user) === "approve" ? db.findBy("finance", "status", "submitted") : Promise.resolve([]),
  ]);
  const badges: Partial<Record<NavKey, number>> = {
    tasks: tasks.filter((t) => t.status !== "done").length,
    submissions: submissions.length,
    content: posts.length,
    members: members.length,
    notifications: notes.filter((n) => !n.read).length,
    finance: finance.length,
  };
  const items = NAV.filter((n) => can(user.role, n.perm) && (n.key !== "finance" || financeAccess(user) !== "none")).map(({ key, label, href }) => ({ key, label, href, badge: badges[key] }));

  return (
    <div className="lg:flex">
      <AdminNav items={items} user={{ name: user.name, roleLabel: roleLabel(user.role) }} logoutAction={logout} />
      <div className="min-w-0 flex-1">
        {(!usingPostgres || !usingCloudStorage) && (
          <div className="border-b border-cream bg-cream/60 px-4 py-2 text-center text-xs text-teal-900 sm:px-8">
            {!usingPostgres && "Local mode: data is saved in a file on this computer. "}
            {!usingCloudStorage && "Uploads are stored locally until cloud file storage (Vercel Blob or Cloudflare R2) is connected."}
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted" role="status">
          Loading admin…
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}

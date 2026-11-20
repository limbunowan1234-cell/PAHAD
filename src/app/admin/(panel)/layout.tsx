import { Suspense } from "react";
import { logout } from "../actions";
import { AdminNav, type NavKey } from "@/components/admin/client";
import { requireUser } from "@/lib/auth/session";
import { db, usingPostgres } from "@/lib/db";
import { can, canEditBanners, canManageMenu, canView, financeAccess, roleLabel, type Permission } from "@/lib/permissions";
import { phaseOf } from "@/lib/polls";
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
  { key: "heroes", label: "Page Banners", href: "/admin/page-images", perm: "dashboard.view" }, // President, L1, or people allowed
  { key: "partners", label: "Partners", href: "/admin/partners", perm: "partners.manage" },
  { key: "videos", label: "Videos", href: "/admin/videos", perm: "dashboard.view" }, // President, or members the President allowed
  { key: "featured", label: "Featured", href: "/admin/featured", perm: "featured.manage" },
  { key: "menu", label: "Menu & Pages", href: "/admin/menu", perm: "dashboard.view" }, // L1, or people the President allowed
  { key: "translations", label: "Nepali", href: "/admin/translations", perm: "dashboard.view" }, // same people as Menu & Pages
  { key: "finance", label: "Finance", href: "/admin/finance", perm: "dashboard.view" },
  { key: "meetings", label: "GB Meetings", href: "/admin/meetings", perm: "gbm.view" },
  { key: "voting", label: "Voting", href: "/admin/voting", perm: "dashboard.view" },
  { key: "circulars", label: "Circulars", href: "/admin/circulars", perm: "circulars.view" },
  { key: "structure", label: "Structure", href: "/admin/structure", perm: "structure.view" },
  { key: "team", label: "Admin Team", href: "/admin/team", perm: "team.view" },
  { key: "activity", label: "Activity Log", href: "/admin/activity", perm: "activity.view" },
  { key: "account", label: "My Account", href: "/admin/account", perm: "dashboard.view" },
];

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [tasks, submissions, posts, members, notes, finance, videos, myBallots, myReceipts] = await Promise.all([
    db.findBy("tasks", "assigned_to", user.id),
    can(user.role, "submissions.view") ? db.findBy("submissions", "status", "new") : Promise.resolve([]),
    can(user.role, "content.publish") ? db.findBy("posts", "status", "pending") : Promise.resolve([]),
    can(user.role, "members.approve") ? db.findBy("members", "status", "applicant") : Promise.resolve([]),
    db.findBy("notifications", "user_id", user.id),
    financeAccess(user) === "approve" ? db.findBy("finance", "status", "submitted") : Promise.resolve([]),
    can(user.role, "videos.manage") ? db.findBy("videos", "status", "pending") : Promise.resolve([]),
    db.findBy("poll_voters", "user_id", user.id),
    db.findBy("poll_receipts", "user_id", user.id),
  ]);
  // Open polls this member can still vote in.
  const votedIn = new Set(myReceipts.map((r) => r.poll_id));
  const openBallots = (await Promise.all(myBallots.filter((v) => !votedIn.has(v.poll_id)).map((v) => db.get("polls", v.poll_id))))
    .filter((p) => p && !p.archived && phaseOf(p) === "active").length;
  const badges: Partial<Record<NavKey, number>> = {
    tasks: tasks.filter((t) => t.status !== "done").length,
    submissions: submissions.length,
    content: posts.length,
    members: members.length,
    notifications: notes.filter((n) => !n.read).length,
    finance: finance.length,
    videos: videos.length,
    voting: openBallots,
  };
  const showVideos = canView(user.role, "videos.manage") || user.can_submit_videos;
  const items = NAV.filter((n) => canView(user.role, n.perm) && (n.key !== "finance" || financeAccess(user) !== "none") && (n.key !== "videos" || showVideos) && (!["menu", "translations"].includes(n.key) || canManageMenu(user) || user.role === "sysadmin") && (n.key !== "heroes" || canEditBanners(user) || user.role === "sysadmin")).map(({ key, label, href }) => ({ key, label, href, badge: badges[key] }));

  return (
    <div className="lg:flex">
      <AdminNav items={items} user={{ name: user.name, roleLabel: roleLabel(user.role) }} logoutAction={logout} />
      <div className="min-w-0 flex-1">
        {(!usingPostgres || !usingCloudStorage) && (
          <div className="border-b border-cream bg-cream/60 px-4 py-2 text-center text-xs text-teal-900 sm:px-8">
            {!usingPostgres && "Local mode: data is saved in a file on this computer. "}
            {!usingCloudStorage && "Uploads are stored locally until cloud file storage (Google Drive, Vercel Blob or Cloudflare R2) is connected."}
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

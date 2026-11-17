import Link from "next/link";
import { CheckSquare, FilePlus2, ImagePlus, Inbox, UserPlus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { abilities, can, ROLES, roleTitle } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";
import { MemberPortal } from "@/components/admin/MemberPortal";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const [members, posts, tasks, submissions, activity, users] = await Promise.all([
    db.all("members"), db.all("posts"), db.all("tasks"), db.all("submissions"), db.all("activity"), db.all("users"),
  ]);
  const role = ROLES.find((r) => r.id === user.role)!;
  const myTasks = tasks.filter((t) => t.assigned_to === user.id && t.status !== "done");
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "—";

  const stats = [
    { label: "Active members", value: members.filter((m) => m.status === "active").length, href: "/admin/members", show: can(user.role, "members.view") },
    { label: "Applications to review", value: members.filter((m) => m.status === "applicant").length, href: "/admin/members?status=applicant", show: can(user.role, "members.approve") },
    { label: "Content awaiting review", value: posts.filter((p) => p.status === "pending").length, href: "/admin/content?status=pending", show: can(user.role, "content.publish") },
    { label: "New messages", value: submissions.filter((s) => s.status === "new").length, href: "/admin/submissions", show: can(user.role, "submissions.view") },
    { label: "My open tasks", value: myTasks.length, href: "/admin/tasks", show: true },
    { label: "My pending uploads", value: posts.filter((p) => p.author_id === user.id && p.status === "pending").length, href: "/admin/content", show: user.role === "editor" },
  ].filter((s) => s.show);

  const quick = [
    { label: "New content", href: "/admin/content/new", icon: FilePlus2, show: can(user.role, "content.create") },
    { label: "Add member", href: "/admin/members#add", icon: UserPlus, show: can(user.role, "members.create") },
    { label: "Upload photos", href: "/admin/gallery", icon: ImagePlus, show: can(user.role, "media.upload") },
    { label: "Assign a task", href: "/admin/tasks#assign", icon: CheckSquare, show: can(user.role, "tasks.assign") },
    { label: "Read messages", href: "/admin/submissions", icon: Inbox, show: can(user.role, "submissions.view") },
    { label: "Manage admins", href: "/admin/team", icon: Users, show: can(user.role, "team.manage") },
  ].filter((q) => q.show);


  return (
    <>
      <PageHeader
        title={`Namaste, ${user.name.split(" ")[0]}`}
        description={
          <>
            You are signed in as <strong>{roleTitle(user)}</strong> ({role.tier}){user.designation && user.designation !== role.label ? ` · ${user.designation}` : ""}. {role.summary}
          </>
        }
      />

      {user.role === "editor" && <MemberPortal user={user} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl border border-line bg-white p-5 hover:border-teal">
            <p className="font-display text-4xl text-teal">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {quick.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="My tasks">
          {myTasks.length ? (
            <ul className="divide-y divide-line">
              {myTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink">{t.title}</p>
                    <p className="text-xs text-muted">From {nameOf(t.assigned_by)}{t.due_date && ` · due ${formatDate(t.due_date)}`}</p>
                  </div>
                  <Badge tone={t.priority === "high" ? "red" : t.status === "in_progress" ? "amber" : "grey"}>
                    {t.priority === "high" ? "High priority" : t.status === "in_progress" ? "In progress" : "To do"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No open tasks. Nice work.</Empty>
          )}
        </Card>

        {can(user.role, "activity.view") ? (
          <Card title="Recent activity">
            {activity.length ? (
              <ul className="space-y-3 text-sm">
                {activity.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <span className="font-semibold text-teal">{a.actor_name}</span> {a.action} {a.entity}: <span className="text-ink">{a.summary}</span>
                    <span className="block text-xs text-muted">{formatDate(a.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Actions taken by admins will appear here.</Empty>
            )}
          </Card>
        ) : (
          <Card title="What your role can do">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {abilities(user.role).map((a) => (
                <li key={a} className="rounded-lg bg-sand px-3 py-2 text-teal">{a}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

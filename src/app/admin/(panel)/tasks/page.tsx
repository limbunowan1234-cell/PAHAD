import { createTask, deleteTask, setTaskStatus } from "../../actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, roleLabel } from "@/lib/permissions";
import type { Task } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Tasks" };

const COLUMNS: { status: Task["status"]; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

export default async function TasksPage() {
  const user = await requireUser();
  const [tasks, users] = await Promise.all([db.all("tasks"), db.all("users")]);
  const seeAll = can(user.role, "tasks.view_all");
  const visible = seeAll ? tasks : tasks.filter((t) => t.assigned_to === user.id);
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "Former admin";
  const assignable = users.filter((u) => u.active);

  return (
    <>
      <PageHeader
        title="Tasks"
        description={seeAll ? "Assign work to the admin team and follow progress." : "Work assigned to you. Update the status as you go."}
      />

      {can(user.role, "tasks.assign") && (
        <div id="assign" className="mb-8 scroll-mt-24">
          <Disclosure summary="Assign a new task" defaultOpen>
            <AdminForm action={createTask} submitLabel="Assign task" resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Task *" className="sm:col-span-2"><input name="title" required className="field" placeholder="e.g. Upload photos from Saturday's workshop" /></Field>
                <Field label="Details" className="sm:col-span-2"><textarea name="description" rows={3} className="field" /></Field>
                <Field label="Assign to *">
                  <select name="assigned_to" required className="field" defaultValue="">
                    <option value="" disabled>Choose a person</option>
                    {assignable.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role)})</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Due date"><input type="date" name="due_date" className="field" /></Field>
                  <Field label="Priority">
                    <select name="priority" className="field" defaultValue="normal">
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </Field>
                </div>
              </div>
            </AdminForm>
          </Disclosure>
        </div>
      )}

      {visible.length === 0 ? (
        <Empty>No tasks yet.</Empty>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const list = visible.filter((t) => t.status === col.status);
            return (
              <Card key={col.status} title={`${col.label} (${list.length})`} className="!bg-white/70">
                <ul className="space-y-3">
                  {list.map((t) => {
                    const mine = t.assigned_to === user.id;
                    return (
                      <li key={t.id} className="rounded-xl border border-line bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-ink">{t.title}</p>
                          {t.priority === "high" && <Badge tone="red">High</Badge>}
                        </div>
                        {t.description && <p className="mt-1 text-sm text-muted">{t.description}</p>}
                        <p className="mt-2 text-xs text-muted">
                          {seeAll && <>For <strong className="text-teal">{name(t.assigned_to)}</strong> · </>}
                          from {name(t.assigned_by)}
                          {t.due_date && <> · due {formatDate(t.due_date, { day: "numeric", month: "short" })}</>}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {(mine || seeAll) && COLUMNS.filter((c) => c.status !== t.status).map((c) => (
                            <ActionButton key={c.status} action={setTaskStatus.bind(null, t.id, c.status)}>→ {c.label}</ActionButton>
                          ))}
                          {can(user.role, "tasks.delete") && (
                            <ActionButton variant="danger" confirm="Delete this task?" action={deleteTask.bind(null, t.id)}>Delete</ActionButton>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

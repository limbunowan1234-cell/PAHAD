import "server-only";
import { db, newId } from "../db";
import { notify, now } from "../admin-helpers";
import type { Approval, PublicUser } from "../types";

type NewRequest = Pick<Approval, "kind" | "entity" | "entity_id" | "title" | "target">;

/**
 * Opens an approval request for the President and assigned approvers (one pending request per item and kind;
 * asking again updates the target). Returns false when one was already waiting.
 */
export async function openApprovalRequest(user: PublicUser, a: NewRequest): Promise<boolean> {
  const dup = (await db.findBy("approvals", "entity_id", a.entity_id)).find((x) => x.status === "pending" && x.kind === a.kind);
  if (dup) {
    if (dup.target !== a.target) await db.update("approvals", dup.id, { target: a.target });
    return false;
  }
  await db.insert("approvals", { ...a, id: newId(), status: "pending", requested_by: user.id, requested_by_name: user.name, decided_by_name: "", note: "", created_at: now(), decided_at: "" });
  const approvers = (await db.all("users")).filter((u) => u.active && (u.role === "super_admin" || u.can_approve_public));
  for (const u of approvers) if (u.id !== user.id) await notify(u.id, `${user.name} asks for approval: “${a.title}”.`, "/admin/approvals");
  return true;
}

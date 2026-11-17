import type { Post, PublicUser, Role } from "./types";

/** Who can open a Training Material item. "" means every signed-in member. */
export type TrainingAudience = "" | "executive" | "governing_body";

export const TRAINING_AUDIENCE: Record<TrainingAudience, string> = {
  "": "All members (every signed-in account)",
  executive: "Executive Body and Governing Body (L1–L2)",
  governing_body: "Governing Body only (L1)",
};

const GB: Role[] = ["super_admin", "general_secretary", "joint_secretary", "treasurer", "gb_member"];
const EXEC: Role[] = [...GB, "admin", "executive_secretary", "record_officer"];

export function trainingAudience(value: string): TrainingAudience {
  return value === "executive" || value === "governing_body" ? value : "";
}

/** Can this signed-in account open the post? Only Training Material is restricted by level. */
export function canSeePost(user: PublicUser | null, post: Pick<Post, "audience" | "author_id">): boolean {
  if (!user) return false;
  const audience = trainingAudience(post.audience);
  if (!audience || user.role === "sysadmin" || user.id === post.author_id) return true;
  return audience === "executive" ? EXEC.includes(user.role) : GB.includes(user.role);
}

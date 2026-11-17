import { within, type Structure } from "./permissions";
import type { Circular, CircularAudience, PublicUser, Role } from "./types";

export const AUDIENCE: Record<CircularAudience, string> = {
  general_assembly: "General Assembly (L6)",
  governing_body: "Governing Body (L1)",
  executive: "Executive Body (L2)",
  all: "Everyone",
};
const GB: Role[] = ["super_admin", "general_secretary", "joint_secretary", "treasurer", "gb_member"];
const EXEC: Role[] = ["admin", "executive_secretary", "record_officer"];
const RECORD_KEEPERS: Role[] = ["super_admin", "general_secretary", "joint_secretary", "record_officer", "sysadmin"];

/** Record keepers see every circular; others see those addressed to them (and to their area). */
export function canSeeCircular(s: Structure, user: PublicUser, memberGeo: string, c: Circular) {
  if (RECORD_KEEPERS.includes(user.role)) return true;
  const inAudience =
    c.audience === "all" ||
    (c.audience === "general_assembly" && user.role === "editor") ||
    (c.audience === "governing_body" && GB.includes(user.role)) ||
    (c.audience === "executive" && EXEC.includes(user.role));
  if (!inAudience) return false;
  return !c.geo || within(s, user.geo || memberGeo, c.geo);
}

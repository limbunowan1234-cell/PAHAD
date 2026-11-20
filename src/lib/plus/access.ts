import { can, roleInfo } from "../permissions";
import type { PlusPost, PublicUser } from "../types";

/**
 * Who may do what in PAHAD+, for dashboard accounts. All checked on the server.
 * The President always may; other members only when the President switched it on for them (Admin Team).
 */
const isPresident = (u: Pick<PublicUser, "role">) => u.role === "super_admin";

/** Open the PAHAD+ queue and act on posts. */
export const canModeratePlus = (u: PublicUser) => isPresident(u) || u.can_verify_plus;

/**
 * Verify a particular post. Region-scoped verifiers only act in their region.
 * Roam (places) needs a verifier above the General Assembly (L1–L5) or a local verifier for that region.
 */
export function canVerifyPlusPost(u: PublicUser, post: Pick<PlusPost, "hub" | "region">): boolean {
  if (isPresident(u)) return true;
  if (!u.can_verify_plus) return false;
  if (u.plus_region && u.plus_region !== post.region) return false;
  if (post.hub === "roam") return roleInfo(u.role).level <= 5 || u.plus_region === post.region;
  return true;
}

/** Flag-Proof (can't be held by community reports): President only. */
export const canGrantFlagProof = (u: PublicUser) => can(u.role, "plus.flagproof");

/** Approve internal → public, and organisation posts for PAHAD+. */
export const canApprovePublic = (u: PublicUser) => isPresident(u) || u.can_approve_public;

import "server-only";
import { randomInt } from "node:crypto";
import QRCode from "qrcode";
import { getCurrentUser } from "../auth/session";
import { db } from "../db";
import { site } from "../site";
import type { PlusPost } from "../types";
import { canVerifyPlusPost } from "./access";
import { isLivePlus, isVerifiedPlus } from "./posts";
import { getPlusUser } from "./session";

// No 0/O or 1/I, so a code read out at the gate can't be mistaken.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PASS_CODE = /^[A-HJ-NP-Z2-9]{10}$/;
export const newPassCode = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const passUrl = (code: string) => `${site.url}/plus/pass/${code}`;

/** Codes typed or scanned at the gate: the QR holds the pass link, so take its last part. */
export function codeFrom(input: string) {
  const m = input.toUpperCase().replace(/[\s-]/g, "").match(/([A-HJ-NP-Z2-9]{10})$/);
  return m ? m[1] : "";
}

export async function qrSvg(text: string) {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#13262b", light: "#ffffff" } });
}

/** Passes that hold a place (checked-in people still count). */
export async function takenPlaces(postId: string) {
  return (await db.findBy("plus_passes", "post_id", postId)).filter((p) => p.status !== "cancelled").length;
}

/** Can people get an E-Pass for this event right now? Only verified, live events that offer passes. */
export function passesOpen(p: PlusPost, at = Date.now()) {
  return p.hub === "events" && p.pass_enabled && isVerifiedPlus(p) && isLivePlus(p, at);
}

/**
 * Who may run the gate for an event: the PP user who posted it (the organiser), or a PAHAD dashboard account that may
 * verify it (President or an assigned verifier for its region). SYS sees the list read-only.
 */
export async function gateAccess(p: PlusPost): Promise<{ name: string; canAct: boolean } | null> {
  const [pp, admin] = await Promise.all([getPlusUser(), getCurrentUser()]);
  if (pp && pp.id === p.author_id) return { name: `${pp.name} (organiser)`, canAct: true };
  if (admin && canVerifyPlusPost(admin, p)) return { name: `${admin.name} (PAHAD)`, canAct: true };
  if (admin && admin.role === "sysadmin") return { name: admin.name, canAct: false };
  return null;
}

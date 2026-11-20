"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { updateTag } from "next/cache";
import { db, newId } from "@/lib/db";
import { now, str, type ActionState } from "@/lib/admin-helpers";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/google";
import { site } from "@/lib/site";
import { ACCOUNT_TYPES, PLUS_RULES, type PlusAccountType } from "./config";
import { clearPlusSession, getPlusUser, setPlusSession } from "./session";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Light throttles per server instance (on top of the database checks below).
const hits = new Map<string, number[]>();
function tooMany(key: string, max: number, windowMs: number) {
  const t = Date.now();
  const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
  recent.push(t);
  hits.set(key, recent);
  return recent.length > max;
}

/** Only paths inside PAHAD+ (never another site). */
const safeNext = (next: string) => (/^\/plus(\/[\w\-./?=&%#]*)?$/.test(next) ? next : "/plus");

async function issueToken(userId: string, kind: "verify" | "reset") {
  const token = randomBytes(32).toString("base64url");
  const ttl = kind === "verify" ? PLUS_RULES.verifyLinkHours * 3_600_000 : PLUS_RULES.resetLinkMinutes * 60_000;
  await db.insert("plus_tokens", { id: hash(token), user_id: userId, kind, expires_at: new Date(Date.now() + ttl).toISOString(), used: false, created_at: now() });
  return token;
}

function sendVerifyEmail(to: string, name: string, token: string) {
  // After the response, so the reply time is the same whatever happens.
  after(() =>
    sendEmail(
      to,
      "Confirm your PAHAD+ account",
      [
        `Namaste ${name},`,
        "",
        "Welcome to PAHAD+. Please confirm your email address to start posting:",
        "",
        `${site.url}/plus/verify?token=${token}`,
        "",
        `The link works for ${PLUS_RULES.verifyLinkHours} hours. If you didn't sign up, you can ignore this email.`,
        "",
        "PAHAD+",
      ].join("\n"),
    ).then(() => undefined),
  );
}

// ------------------------------------------------------------------ sign up / in / out
export async function signUpPlus(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (str(fd, "website")) return { ok: true, message: "Thank you." }; // honeypot
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 160).toLowerCase();
  const phone = str(fd, "phone", 30);
  const account_type = str(fd, "account_type", 20) as PlusAccountType;
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { ok: false, message: "Please enter your name." };
  if (!EMAIL.test(email)) return { ok: false, message: "Please enter a valid email address." };
  if (!Object.hasOwn(ACCOUNT_TYPES, account_type)) return { ok: false, message: "Choose Individual, Business or Organisation." };
  const weak = validatePasswordStrength(password);
  if (weak) return { ok: false, message: weak };
  if (fd.get("terms") !== "on") return { ok: false, message: "Please accept the PAHAD+ terms and community guidelines." };
  if (tooMany(`signup:${email}`, 3, 60 * 60_000)) return { ok: false, message: "Too many attempts. Please try again later." };

  const existing = (await db.all("plus_users")).find((u) => u.email.toLowerCase() === email);
  if (existing) return { ok: false, message: "An account with this email already exists. Sign in, or use “Forgot password?”." };

  const id = newId();
  await db.insert("plus_users", {
    id, email, name, phone, account_type, password_hash: hashPassword(password), email_verified: false,
    terms_accepted_at: now(), status: "active", created_at: now(), last_login: now(),
  });
  sendVerifyEmail(email, name, await issueToken(id, "verify"));
  await setPlusSession(id);
  redirect("/plus/me?welcome=1");
}

export async function signInPlus(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email", 160).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (tooMany(`signin:${email}`, 5, 10 * 60_000)) return { ok: false, message: "Too many attempts. Please wait 10 minutes and try again." };
  const u = (await db.all("plus_users")).find((x) => x.email.toLowerCase() === email);
  if (!u || u.status !== "active" || !verifyPassword(password, u.password_hash)) return { ok: false, message: "Email or password is incorrect." };
  await db.update("plus_users", u.id, { last_login: now() });
  await setPlusSession(u.id);
  redirect(safeNext(str(fd, "next", 300)));
}

export async function signOutPlus() {
  await clearPlusSession();
  redirect("/plus");
}

// ------------------------------------------------------------------ email verification
/** The token is bound on the server (verifyPlusEmail.bind(null, token)), not sent in a form field. */
export async function verifyPlusEmail(rawToken: string): Promise<ActionState> {
  const token = String(rawToken ?? "").slice(0, 200);
  const row = token ? await db.get("plus_tokens", hash(token)) : null;
  if (!row || row.kind !== "verify" || row.used || Date.parse(row.expires_at) <= Date.now()) {
    return { ok: false, message: "This link is invalid or has expired. Sign in and ask for a new one." };
  }
  await db.update("plus_tokens", row.id, { used: true });
  await db.update("plus_users", row.user_id, { email_verified: true });
  return { ok: true, message: "Your email is confirmed. You can post on PAHAD+ now." };
}

export async function resendVerification(): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  if (u.email_verified) return { ok: true, message: "Your email is already confirmed." };
  if (tooMany(`verify:${u.id}`, 3, 60 * 60_000)) return { ok: false, message: "Please wait a while before asking again." };
  sendVerifyEmail(u.email, u.name, await issueToken(u.id, "verify"));
  return { ok: true, message: `We sent a new link to ${u.email}.` };
}

// ------------------------------------------------------------------ password reset
const SENT = "If that email has a PAHAD+ account, a reset link is on its way. It works for 30 minutes.";

export async function requestPlusReset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email", 160).toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, message: "Please enter a valid email address." };
  if (tooMany(`reset:${email}`, 3, 60 * 60_000)) return { ok: true, message: SENT };
  const u = (await db.all("plus_users")).find((x) => x.email.toLowerCase() === email && x.status === "active");
  if (!u) return { ok: true, message: SENT };
  const token = await issueToken(u.id, "reset");
  after(() =>
    sendEmail(u.email, "Reset your PAHAD+ password", [
      `Namaste ${u.name},`, "", "Open this link within 30 minutes to choose a new PAHAD+ password. It works once:", "",
      `${site.url}/plus/reset?token=${token}`, "", "If you didn't ask for this, you can ignore this email.", "", "PAHAD+",
    ].join("\n")).then(() => undefined),
  );
  return { ok: true, message: SENT };
}

export async function resetPlusPassword(rawToken: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const invalid = { ok: false, message: "This reset link is invalid or has expired. Ask for a new one." };
  const token = String(rawToken ?? "").slice(0, 200);
  const row = token ? await db.get("plus_tokens", hash(token)) : null;
  if (!row || row.kind !== "reset" || row.used || Date.parse(row.expires_at) <= Date.now()) return invalid;
  const password = String(fd.get("password") ?? "");
  const weak = validatePasswordStrength(password);
  if (weak) return { ok: false, message: weak };
  if (password !== String(fd.get("confirm") ?? "")) return { ok: false, message: "The two passwords don't match." };
  await db.update("plus_users", row.user_id, { password_hash: hashPassword(password) });
  for (const t of await db.findBy("plus_tokens", "user_id", row.user_id)) if (!t.used && t.kind === "reset") await db.update("plus_tokens", t.id, { used: true });
  return { ok: true, message: "Your password has been changed. You can sign in now." };
}

// ------------------------------------------------------------------ profile + account deletion
export async function updatePlusProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  const name = str(fd, "name", 120);
  if (name.length < 2) return { ok: false, message: "Please enter your name." };
  await db.update("plus_users", u.id, { name, phone: str(fd, "phone", 30) });
  return { ok: true, message: "Saved." };
}

/**
 * Google Play requires in-app account deletion. Removes the account, its sign-in links, blocks and reports,
 * and takes its posts off PAHAD+ with personal contact details cleared.
 */
export async function deletePlusAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await getPlusUser();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const u = await db.get("plus_users", viewer.id);
  if (!u) return { ok: false, message: "Please sign in again." };
  if (str(fd, "confirm", 20) !== "DELETE") return { ok: false, message: "Type DELETE to confirm." };
  if (!verifyPassword(String(fd.get("password") ?? ""), u.password_hash)) return { ok: false, message: "That password is not correct." };

  for (const p of await db.findBy("plus_posts", "author_id", u.id)) {
    await db.update("plus_posts", p.id, {
      status: "removed", author_name: "Deleted account", author_id: "", contact_phone: "", contact_whatsapp: "", contact_email: "",
      address: "", updated_at: now(),
    });
  }
  for (const t of await db.findBy("plus_tokens", "user_id", u.id)) await db.remove("plus_tokens", t.id);
  for (const b of (await db.all("plus_blocks")).filter((x) => x.blocker_id === u.id || x.blocked_id === u.id)) await db.remove("plus_blocks", b.id);
  for (const f of await db.findBy("plus_flags", "user_id", u.id)) await db.remove("plus_flags", f.id);
  await db.remove("plus_users", u.id);
  await db.insert("activity", {
    id: newId(), actor_id: "", actor_name: "PAHAD+ user", action: "deleted account", entity: "plus account", entity_id: u.id,
    summary: "A PAHAD+ user deleted their account", details: "", directorate: "", created_at: now(),
  });
  updateTag("plus");
  await clearPlusSession();
  redirect("/plus?deleted=1");
}

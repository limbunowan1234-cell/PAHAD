"use server";

import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { toPublic } from "@/lib/auth/session";
import { sendEmail } from "@/lib/google";
import { can } from "@/lib/permissions";
import { site } from "@/lib/site";

const TTL_MS = 30 * 60_000; // links work for 30 minutes
const MAX_PER_HOUR = 3; // reset emails per account per hour
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Light throttle per email address (per server instance), on top of the per-account database limit.
const recent = new Map<string, number[]>();
function throttled(key: string) {
  const t = Date.now();
  const hits = (recent.get(key) ?? []).filter((x) => t - x < 15 * 60_000);
  hits.push(t);
  recent.set(key, hits);
  return hits.length > 5;
}

/** The same reply whether or not the address has an account, so the form can't be used to find admins. */
const SENT = "If that email belongs to a PAHAD account, a reset link is on its way. It works for 30 minutes. Check your spam folder too.";

export async function requestPasswordReset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email", 160).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Please enter a valid email address." };
  if (throttled(email)) return { ok: true, message: SENT };

  const user = (await db.all("users")).find((u) => u.email.toLowerCase() === email && u.active);
  if (!user) return { ok: true, message: SENT };

  const lastHour = (await db.findBy("password_resets", "user_id", user.id)).filter((r) => Date.now() - Date.parse(r.created_at) < 60 * 60_000);
  if (lastHour.length >= MAX_PER_HOUR) return { ok: true, message: SENT };

  const token = randomBytes(32).toString("base64url");
  await db.insert("password_resets", { id: hashToken(token), user_id: user.id, expires_at: new Date(Date.now() + TTL_MS).toISOString(), used: false, created_at: now() });
  // Always the configured site address, never the request's Host header.
  const link = `${site.url}/admin/reset-password?token=${token}`;

  // Send after the response, so the reply takes the same time whether or not the account exists.
  after(async () => {
    const sent = await sendEmail(
      user.email,
      "Reset your PAHAD password",
      [
        `Namaste ${user.name},`,
        "",
        "Someone (hopefully you) asked to reset the password for your PAHAD dashboard account.",
        "Open this link within 30 minutes to choose a new password. It works once:",
        "",
        link,
        "",
        "If you didn't ask for this, you can ignore this email. Your password stays the same.",
        "",
        "PAHAD",
      ].join("\n"),
    );
    await log(toPublic(user), "requested password reset", "account", user.id, sent ? "Reset link emailed" : "Email not delivered; President notified");
    if (!sent) {
      // Email isn't set up or failed: the President can still reset it from Admin Team.
      const presidents = (await db.all("users")).filter((u) => u.active && u.id !== user.id && can(u.role, "team.manage"));
      for (const p of presidents) {
        await notify(p.id, `${user.name} (${user.email}) asked to reset their password, but the email could not be sent. Reset it from Admin Team → Edit access.`, "/admin/team");
      }
    }
  });
  return { ok: true, message: SENT };
}

export async function resetPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token", 200);
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const invalid = { ok: false, message: "This reset link is invalid or has expired. Ask for a new one." };
  if (!token) return invalid;

  const row = await db.get("password_resets", hashToken(token));
  if (!row || row.used || Date.parse(row.expires_at) <= Date.now()) return invalid;
  const user = await db.get("users", row.user_id);
  if (!user || !user.active) return invalid;

  const weak = validatePasswordStrength(password);
  if (weak) return { ok: false, message: weak };
  if (password !== confirm) return { ok: false, message: "The two passwords don't match." };

  await db.update("users", user.id, { password_hash: hashPassword(password) });
  // This link and any other open links for the account stop working.
  for (const r of await db.findBy("password_resets", "user_id", user.id)) if (!r.used) await db.update("password_resets", r.id, { used: true });
  await log(toPublic(user), "reset password", "account", user.id, "Password changed with an emailed reset link");
  return { ok: true, message: "Your password has been changed. You can sign in now." };
}

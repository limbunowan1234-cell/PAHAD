import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { connection } from "next/server";
import { secret } from "../auth/session";
import { db } from "../db";
import type { PlusUser } from "../types";

/**
 * PAHAD+ (PP user) sessions. A separate cookie, signed with its own context, so a PP session can never be
 * read as a dashboard session (getCurrentUser only reads "pahad_session") and vice versa.
 */
const COOKIE = "pahad_plus_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days: an app login should last

const sign = (value: string) => createHmac("sha256", secret()).update(`pahad-plus:${value}`).digest("base64url");

function encode(userId: string) {
  const payload = Buffer.from(JSON.stringify({ pp: userId, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const { pp, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { pp: string; exp: number };
    return typeof pp === "string" && exp > Date.now() ? pp : null;
  } catch {
    return null;
  }
}

export async function setPlusSession(userId: string) {
  (await cookies()).set(COOKIE, encode(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearPlusSession() {
  (await cookies()).delete(COOKIE);
}

export type PlusViewer = Omit<PlusUser, "password_hash">;

/** The signed-in PP user, re-read from the database on every request (suspension / deletion apply at once). */
export const getPlusUser = cache(async (): Promise<PlusViewer | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  await connection();
  const id = decode(token);
  if (!id) return null;
  const u = await db.get("plus_users", id);
  if (!u || u.status !== "active") return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...rest } = u;
  return rest;
});

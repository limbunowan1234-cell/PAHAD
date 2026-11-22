import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { db } from "@/lib/db";
import { appCheckin, appCircular, appConfig, appDiscover, appFeed, appMe, appPass, appPost, appProfile, filtersFrom } from "@/lib/plus/app-api";
import { deletePlusAccount, requestMemberLink, requestPlusReset, resendVerification, signInPlus, signUpPlus, unlinkMember, updatePlusProfile } from "@/lib/plus/account-actions";
import { cancelPass, checkInPass, decidePass, registerPass } from "@/lib/plus/pass-actions";
import { applyAsOrganiser, confirmPaidPass, startPaidPass } from "@/lib/plus/pay-actions";
import { blockPlusUser, createPlusPost, deleteOwnPlusPost, reportPlusPost, toggleFollow, toggleLike, toggleSave, toggleSupport, unblockPlusUser } from "@/lib/plus/post-actions";
import { markPlusNotificationsRead, setPlusAccountType, setPlusSetting, updateCollabContacts } from "@/lib/plus/profile-actions";
import { getPlusUser, plusAppToken } from "@/lib/plus/session";
import type { PlusAccountType } from "@/lib/plus/config";

/**
 * The PAHAD+ phone app's API. The app signs in with /auth/login and then sends "Authorization: Bearer <token>".
 * Every write goes through the same functions as the website (same checks, limits and moderation rules).
 */

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const notFound = () => json({ ok: false, message: "Not found." }, 404);
const needSignIn = () => json({ ok: false, message: "Please sign in.", signIn: true }, 401);

type Ctx = { params: Promise<{ path: string[] }> };

/** Runs a website action. Actions that finish by redirecting (e.g. to a new post) report where they went. */
async function act(fn: () => Promise<unknown>) {
  try {
    const r = await fn();
    return json(r ?? { ok: true, message: "Done." });
  } catch (e) {
    if (isRedirectError(e)) return json({ ok: true, message: "Done.", redirect: getURLFromRedirectError(e) });
    throw e;
  }
}

/** Accepts multipart forms (posts with photos) or JSON, as the FormData the website's actions expect. */
async function formFrom(req: Request): Promise<FormData> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) return req.formData();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") { if (v) fd.set(k, "on"); }
    else if (Array.isArray(v)) v.forEach((x) => fd.append(k, String(x)));
    else fd.set(k, String(v));
  }
  return fd;
}

const bodyOf = async (fd: FormData, key: string) => String(fd.get(key) ?? "");

export async function GET(req: Request, { params }: Ctx) {
  const { path } = await params;
  const [a, b] = path;
  const viewer = await getPlusUser();
  const sp = new URL(req.url).searchParams;
  switch (a) {
    case "config":
      return json(appConfig());
    case "feed":
      return json(await appFeed(viewer, filtersFrom(sp)));
    case "post": {
      const r = b ? await appPost(viewer, b) : null;
      return r ? json(r) : notFound();
    }
    case "circular": {
      const r = b ? await appCircular(b) : null;
      return r ? json(r) : notFound();
    }
    case "discover":
      return json(await appDiscover(viewer));
    case "user": {
      const r = b ? await appProfile(viewer, b) : null;
      return r ? json(r) : notFound();
    }
    case "me":
      return viewer ? json(await appMe(viewer)) : needSignIn();
    case "pass": {
      if (!viewer) return needSignIn();
      const r = b ? await appPass(viewer, b) : null;
      return r ? json(r) : notFound();
    }
    case "checkin": {
      if (!viewer) return needSignIn();
      const r = b ? await appCheckin(b) : null;
      return r ? json(r) : json({ ok: false, message: "Only the organiser or a PAHAD verifier can see this." }, 403);
    }
    default:
      return notFound();
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { path } = await params;
  const [a, b, c] = path;
  const fd = await formFrom(req);

  // ---------------------------------------------------------------- sign in / up (return an app token)
  if (a === "auth") {
    if (b === "login" || b === "signup") {
      const email = (await bodyOf(fd, "email")).trim().toLowerCase();
      try {
        const r = b === "login" ? await signInPlus(null, fd) : await signUpPlus(null, fd);
        return json(r ?? { ok: false, message: "Something went wrong." }); // an error message (success redirects)
      } catch (e) {
        if (!isRedirectError(e)) throw e;
        const u = (await db.all("plus_users")).find((x) => x.email.toLowerCase() === email);
        if (!u) return json({ ok: false, message: "Something went wrong." }, 500);
        return json({ ok: true, message: b === "signup" ? "Welcome to PAHAD+! Check your email to confirm your account." : "Signed in.", token: plusAppToken(u.id) });
      }
    }
    if (b === "forgot") return act(() => requestPlusReset(null, fd));
    if (b === "resend") return act(() => resendVerification());
    if (b === "logout") return json({ ok: true, message: "Signed out." }); // the app forgets its token
    return notFound();
  }

  const viewer = await getPlusUser();
  if (!viewer) return needSignIn();

  switch (a) {
    case "posts": // create (multipart: same fields as the website's form, photo in "image")
      return act(() => createPlusPost(null, fd));
    case "post":
      if (!b) return notFound();
      if (c === "like") return act(() => toggleLike(b));
      if (c === "save") return act(() => toggleSave(b));
      if (c === "support") return act(() => toggleSupport(b));
      if (c === "delete") return act(() => deleteOwnPlusPost(b));
      if (c === "report") { fd.set("post_id", b); return act(() => reportPlusPost(null, fd)); }
      return notFound();
    case "user":
      if (!b) return notFound();
      if (c === "follow") return act(() => toggleFollow(b));
      if (c === "block") return act(() => blockPlusUser(b));
      if (c === "unblock") return act(() => unblockPlusUser(b));
      return notFound();
    case "pass":
      if (b === "register") return act(async () => registerPass(await bodyOf(fd, "postId")));
      if (b && c === "cancel") return act(() => cancelPass(b));
      if (b && c === "decide") return act(async () => decidePass(b, (await bodyOf(fd, "decision")) === "approve" ? "approve" : "revoke"));
      return notFound();
    case "checkin":
      return b ? act(() => checkInPass(b, null, fd)) : notFound();
    case "pay":
      if (b === "start") return act(async () => startPaidPass(await bodyOf(fd, "postId")));
      if (b === "confirm") return act(async () => confirmPaidPass({ orderId: await bodyOf(fd, "orderId"), paymentId: await bodyOf(fd, "paymentId"), signature: await bodyOf(fd, "signature") }));
      return notFound();
    case "me":
      if (b === "profile") return act(() => updatePlusProfile(null, fd));
      if (b === "contacts") return act(() => updateCollabContacts(null, fd));
      if (b === "setting") return act(async () => setPlusSetting((await bodyOf(fd, "key")) as Parameters<typeof setPlusSetting>[0], fd.get("on") === "on"));
      if (b === "account-type") return act(async () => setPlusAccountType((await bodyOf(fd, "type")) as PlusAccountType));
      if (b === "notifications-read") return act(() => markPlusNotificationsRead());
      if (b === "organiser") return act(() => applyAsOrganiser(null, fd));
      if (b === "member-link") return act(() => requestMemberLink(null, fd));
      if (b === "member-unlink") return act(() => unlinkMember());
      if (b === "delete") return act(() => deletePlusAccount(null, fd));
      return notFound();
    default:
      return notFound();
  }
}

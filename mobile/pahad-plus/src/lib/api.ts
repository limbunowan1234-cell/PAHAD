import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { CheckinView, Circular, Config, Discover, Me, PassView, PostDetail, Profile, Result, Card, Tab } from "./types";

/** All data comes from the PAHAD website (pahad.org/api/app/v1). */
export const SITE = (Constants.expoConfig?.extra?.apiBase as string | undefined) ?? "https://pahad.org";
const BASE = `${SITE}/api/app/v1`;
const TOKEN_KEY = "pahad_plus_token";

let token: string | null = null;
let onSignedOut: (() => void) | null = null;

export async function loadToken() {
  try {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    token = null;
  }
  return token;
}
export async function saveToken(t: string | null) {
  token = t;
  try {
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* keep it in memory for this session */
  }
}
export const hasToken = () => Boolean(token);
export const setSignedOutHandler = (fn: () => void) => { onSignedOut = fn; };

export class ApiError extends Error {
  constructor(message: string, public status: number, public signIn = false) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("You're offline. Check your internet connection and try again.", 0);
  }
  const data = (await res.json().catch(() => null)) as (T & { message?: string; signIn?: boolean }) | null;
  if (res.status === 401) {
    if (token) { await saveToken(null); onSignedOut?.(); }
    throw new ApiError(data?.message ?? "Please sign in.", 401, true);
  }
  if (!res.ok) throw new ApiError(data?.message ?? "Something went wrong. Please try again.", res.status);
  return data as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T = Result>(path: string, body?: Record<string, unknown>) =>
  request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });

export type FeedFilters = { tab?: Tab; hub?: string; region?: string; type?: string; q?: string };
const qs = (o: Record<string, string | undefined>) => {
  const p = Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
  return p.length ? `?${p.join("&")}` : "";
};

export const api = {
  config: () => get<Config>("/config"),
  feed: (f: FeedFilters) => get<{ items: Card[]; signedIn: boolean }>(`/feed${qs(f)}`),
  post: (id: string) => get<PostDetail>(`/post/${encodeURIComponent(id)}`),
  circular: (id: string) => get<Circular>(`/circular/${encodeURIComponent(id)}`),
  discover: () => get<Discover>("/discover"),
  profile: (id: string) => get<Profile>(`/user/${encodeURIComponent(id)}`),
  me: () => get<Me>("/me"),
  pass: (code: string) => get<PassView>(`/pass/${encodeURIComponent(code)}`),
  checkin: (postId: string) => get<CheckinView>(`/checkin/${encodeURIComponent(postId)}`),

  login: (email: string, password: string) => post("/auth/login", { email, password }),
  signup: (b: { name: string; email: string; phone: string; account_type: string; password: string; terms: boolean }) => post("/auth/signup", b),
  forgot: (email: string) => post("/auth/forgot", { email }),
  resend: () => post("/auth/resend"),

  like: (id: string) => post(`/post/${encodeURIComponent(id)}/like`),
  save: (id: string) => post(`/post/${encodeURIComponent(id)}/save`),
  support: (id: string) => post(`/post/${encodeURIComponent(id)}/support`),
  deletePost: (id: string) => post(`/post/${encodeURIComponent(id)}/delete`),
  report: (id: string, reason: string, note: string) => post(`/post/${encodeURIComponent(id)}/report`, { reason, note }),
  follow: (userId: string) => post(`/user/${encodeURIComponent(userId)}/follow`),
  block: (userId: string) => post(`/user/${encodeURIComponent(userId)}/block`),
  unblock: (userId: string) => post(`/user/${encodeURIComponent(userId)}/unblock`),

  registerPass: (postId: string) => post("/pass/register", { postId }),
  cancelPass: (code: string) => post(`/pass/${encodeURIComponent(code)}/cancel`),
  decidePass: (code: string, decision: "approve" | "revoke") => post(`/pass/${encodeURIComponent(code)}/decide`, { decision }),
  checkIn: (postId: string, code: string) => post(`/checkin/${encodeURIComponent(postId)}`, { code }),
  payStart: (postId: string) => post<Result & { key?: string; orderId?: string; amount?: number; name?: string; description?: string; prefill?: { name: string; email: string }; done?: string }>("/pay/start", { postId }),
  payConfirm: (orderId: string, paymentId: string, signature: string) => post<Result & { code?: string }>("/pay/confirm", { orderId, paymentId, signature }),

  updateProfile: (name: string, phone: string) => post("/me/profile", { name, phone }),
  updateContacts: (phone: string, instagram: string, contact_email: string) => post("/me/contacts", { phone, instagram, contact_email }),
  setting: (key: string, on: boolean) => post("/me/setting", { key, on }),
  accountType: (type: string) => post("/me/account-type", { type }),
  notificationsRead: () => post("/me/notifications-read"),
  organiser: (b: Record<string, unknown>) => post("/me/organiser", b),
  memberLink: (b: Record<string, unknown>) => post("/me/member-link", b),
  memberUnlink: () => post("/me/member-unlink"),
  deleteAccount: (password: string) => post("/me/delete", { password, confirm: "DELETE" }),

  /** New post: multipart, with the photo (if any) as "image". */
  createPost: (fields: Record<string, string | boolean | undefined>, photo?: { uri: string; name: string; type: string }) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === "" || v === false) continue;
      fd.append(k, v === true ? "on" : v);
    }
    if (photo) fd.append("image", photo as unknown as Blob);
    return request<Result>("/posts", { method: "POST", body: fd });
  },
};

export const siteUrl = (path: string) => (path.startsWith("http") ? path : `${SITE}${path}`);

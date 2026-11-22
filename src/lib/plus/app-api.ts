import "server-only";
import { db } from "../db";
import { getPublishedVideos } from "../data";
import { youTubeThumb } from "../youtube";
import { timing } from "@/components/plus/ui";
import {
  ACCOUNT_TYPES, BRIEF_TYPES, HUB_KEYS, PLUS_HUBS, PLUS_REGIONS, PLUS_RULES, ROAM_KINDS, ROAM_STAGES, USER_BRIEF_TYPES, plusAccountId,
  type BriefType, type PlusAccountType, type PlusHub,
} from "./config";
import { AUTHOR_BADGE, associateBadges, getPlusPost, getPublicCircular, isLivePlus, plusFeed, toCard, withAuthentic, type PlusCard, type PlusFilters, type PlusTab } from "./posts";
import { gateAccess, passesOpen, takenPlaces } from "./passes";
import { eventMoney, getFeePercent, isApprovedOrganiser, placesHeld } from "./payments";
import { paymentsConfigured, rupees } from "./razorpay";
import type { PlusViewer } from "./session";

/**
 * Read models for the PAHAD+ phone app (JSON at /api/app/v1/…). They apply exactly the same rules as the website's
 * pages: locked details stay out until a post is verified, private profiles stay private, blocked accounts are hidden.
 */

export const appConfig = () => ({
  hubs: HUB_KEYS.map((key) => ({ key, ...PLUS_HUBS[key] })),
  regions: PLUS_REGIONS,
  briefTypes: (Object.keys(BRIEF_TYPES) as BriefType[]).map((key) => ({ key, ...BRIEF_TYPES[key], userCanPost: USER_BRIEF_TYPES.includes(key) })),
  roamKinds: ROAM_KINDS,
  roamStages: Object.entries(ROAM_STAGES).map(([key, label]) => ({ key, label })),
  accountTypes: Object.entries(ACCOUNT_TYPES).map(([key, label]) => ({ key, label })),
  rules: PLUS_RULES,
  paymentsConfigured,
  links: { terms: "/plus/terms", privacy: "/privacy#pahad-plus", deleteAccount: "/plus/delete-account", help: "/plus/help" },
});

function ctaFor(c: PlusCard, pass: string): { label: string; url: string; external: boolean } {
  const l = c.locked;
  if (pass) return { label: `Get ${pass}`, url: "", external: false };
  if (c.briefType === "job") return l?.link ? { label: "Apply for Role", url: l.link, external: true } : { label: "Apply for Role", url: "", external: false };
  if (c.official || c.source === "pahad") return { label: "Read Official Directive", url: c.source === "pahad" && !c.href.startsWith("/plus") ? c.href : "", external: c.source === "pahad" && !c.href.startsWith("/plus") };
  if (c.hub === "roam") return l?.mapLink ? { label: "Explore Trail", url: l.mapLink, external: true } : { label: "Explore Trail", url: "", external: false };
  if (c.hub === "business") return { label: "Connect with Business", url: "", external: false };
  if (c.hub === "events") return { label: "Event details", url: "", external: false };
  return { label: "Read", url: "", external: false };
}

type ViewerSets = { liked: Set<string>; saved: Set<string>; supported: Set<string>; followed: Set<string>; blocked: Set<string> };

async function viewerSets(viewer: PlusViewer | null): Promise<ViewerSets> {
  if (!viewer) return { liked: new Set(), saved: new Set(), supported: new Set(), followed: new Set(), blocked: new Set() };
  const [blocks, likes, saves, follows, supports] = await Promise.all([
    db.findBy("plus_blocks", "blocker_id", viewer.id), db.findBy("plus_likes", "user_id", viewer.id), db.findBy("plus_saves", "user_id", viewer.id),
    db.findBy("plus_follows", "follower_id", viewer.id), db.findBy("plus_supports", "user_id", viewer.id),
  ]);
  return {
    liked: new Set(likes.map((x) => x.post_id)), saved: new Set(saves.map((x) => x.post_id)), supported: new Set(supports.map((x) => x.post_id)),
    followed: new Set(follows.map((x) => x.followee_id)), blocked: new Set(blocks.map((x) => x.blocked_id)),
  };
}

/** A post as the app shows it in the feed and lists. */
function appCard(c: PlusCard, at: number, v: ViewerSets, viewerId: string) {
  const pass = c.passEnabled && c.verified ? (c.price > 0 ? `E-Pass ${rupees(c.price)}` : "Free E-Pass") : "";
  const cta = ctaFor(c, pass);
  return {
    id: c.id,
    source: c.source,
    /** "post" opens in the app; "circular" opens the circular screen; "web" opens the website. */
    open: c.href.startsWith("/plus/c/") ? "circular" : c.href.startsWith("/plus/") ? "post" : "web",
    href: c.href,
    hub: c.hub,
    hubKey: c.briefType === "job" ? "jobs" : c.hub,
    hubLabel: c.briefType ? BRIEF_TYPES[c.briefType].label : PLUS_HUBS[c.hub].label,
    emoji: c.briefType ? BRIEF_TYPES[c.briefType].emoji : PLUS_HUBS[c.hub].emoji,
    briefType: c.briefType,
    kind: c.kind,
    region: c.region,
    locality: c.locality,
    title: c.title,
    summary: c.summary,
    image: c.image || (c.youtubeId ? youTubeThumb(c.youtubeId) : ""),
    youtubeId: c.youtubeId,
    videoUrl: c.videoUrl,
    trust: c.source === "pahad" || c.official ? "pahad" : c.flagProof ? "flag_proof" : c.verified ? "verified" : "unverified",
    verified: c.verified,
    authentic: c.authentic,
    authorBadge: c.authorBadge ? AUTHOR_BADGE[c.authorBadge] : "",
    author: c.authorName,
    authorId: c.authorId,
    authorMember: c.authorMember,
    canFollow: c.source === "user" && Boolean(c.authorId) && c.authorId !== viewerId,
    following: v.followed.has(c.authorId),
    likes: c.likes,
    liked: v.liked.has(c.id),
    saved: v.saved.has(c.id),
    supports: c.supports,
    supported: v.supported.has(c.id),
    flags: c.flags,
    contactsUnverified: c.contactsUnverified,
    pass,
    cta,
    when: timing(c, at),
    alert: c.briefType === "alert",
    createdAt: c.createdAt,
  };
}
export type AppCard = ReturnType<typeof appCard>;

const TABS: PlusTab[] = ["community", "following", "foryou", "pahad"];

export function filtersFrom(sp: URLSearchParams): PlusFilters {
  const tab = sp.get("tab") as PlusTab;
  const hub = sp.get("hub") ?? "";
  const type = sp.get("type") ?? "";
  const region = sp.get("region") ?? "";
  return {
    tab: TABS.includes(tab) ? tab : "community",
    hub: hub === "jobs" || HUB_KEYS.includes(hub as PlusHub) ? (hub as PlusHub | "jobs") : undefined,
    region: (PLUS_REGIONS as readonly string[]).includes(region) ? region : undefined,
    type: Object.hasOwn(BRIEF_TYPES, type) ? (type as BriefType) : undefined,
    q: (sp.get("q") ?? "").slice(0, 80) || undefined,
  };
}

export async function appFeed(viewer: PlusViewer | null, f: PlusFilters) {
  const v = await viewerSets(viewer);
  const cards = await plusFeed(f, v.blocked, v.followed);
  const at = Date.now();
  return { items: cards.map((c) => appCard(c, at, v, viewer?.id ?? "")), signedIn: Boolean(viewer) };
}

const STATUS_NOTE: Record<string, string> = {
  hold: "This post is on hold while PAHAD reviews it. Only you can see it.",
  rejected: "PAHAD did not approve this post. Only you can see it.",
  removed: "You removed this post. Only you can see it.",
};

export async function appPost(viewer: PlusViewer | null, id: string) {
  const post = await getPlusPost(id);
  const at = Date.now();
  const mine = Boolean(viewer && post && post.author_id === viewer.id);
  if (!post || (!isLivePlus(post, at) && !mine)) return null;
  const [c] = await withAuthentic([toCard(post)]);
  const v = await viewerSets(viewer);
  const [myPass, taken] = await Promise.all([
    viewer ? db.get("plus_passes", `${post.id}:${viewer.id}`) : null,
    c.passEnabled ? (post.price > 0 ? placesHeld(post.id, viewer?.id) : takenPlaces(post.id)) : Promise.resolve(0),
  ]);
  const paid = post.price > 0;
  const onSale = paid ? paymentsConfigured && (await isApprovedOrganiser(post.author_id)) : true;
  const left = post.pass_capacity > 0 ? Math.max(post.pass_capacity - taken, 0) : null;
  const holding = myPass && myPass.status !== "cancelled" ? myPass : null;
  let passState: "none" | "holding" | "unverified" | "closed" | "soldout" | "paused" | "buy" | "free" | "signin" = "none";
  if (c.passEnabled) {
    passState = holding ? "holding" : !c.verified ? "unverified" : !passesOpen(post, at) ? "closed" : left === 0 ? "soldout" : paid && !onSale ? "paused" : !viewer ? "signin" : paid ? "buy" : "free";
  }
  return {
    card: appCard(c, at, v, viewer?.id ?? ""),
    body: c.body,
    stage: c.stage ? ROAM_STAGES[c.stage as keyof typeof ROAM_STAGES] ?? "" : "",
    bestSeason: c.bestSeason,
    hours: c.hours,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    deadline: c.deadline,
    locked: c.locked,
    live: isLivePlus(post, at),
    mine,
    statusNote: mine && STATUS_NOTE[post.status] ? `${STATUS_NOTE[post.status]}${post.reject_reason ? ` Reason: ${post.reject_reason}` : ""}` : "",
    status: mine ? post.status : "",
    verifiedByPahad: Boolean(post.verified_by_name && c.verified),
    pass: c.passEnabled
      ? {
          state: passState,
          label: paid ? `E-Pass ${rupees(post.price)}` : "Free E-Pass",
          price: post.price,
          approval: post.pass_mode === "approval",
          left,
          capacity: post.pass_capacity,
          myCode: holding?.code ?? "",
          myStatus: holding?.status ?? "",
          canCheckIn: mine && c.verified,
          registrations: mine ? taken : null,
        }
      : null,
  };
}

export async function appCircular(id: string) {
  const c = await getPublicCircular(id);
  if (!c) return null;
  return { id: c.id, number: c.number, title: c.title, body: c.body, issuedBy: c.issued_by_name, createdAt: c.created_at };
}

export async function appDiscover(viewer: PlusViewer | null) {
  const v = await viewerSets(viewer);
  const [cards, videos, users] = await Promise.all([plusFeed({ tab: "community" }, v.blocked), getPublishedVideos(), db.all("plus_users")]);
  const at = Date.now();
  const items = cards.map((c) => appCard(c, at, v, viewer?.id ?? ""));
  const withVideo = cards.filter((c) => c.youtubeId && c.verified).sort((a, b) => Number(b.spotlight) - Number(a.spotlight));
  const spotlights = withVideo.slice(0, 3).map((c) => ({
    youtubeId: c.youtubeId, title: c.title, text: c.summary, postId: c.source === "user" ? c.id : "", url: "", executive: c.spotlight,
    by: c.official ? "PAHAD Official" : c.authorName, label: `${c.spotlight ? "Featured" : PLUS_HUBS[c.hub].label} • ${c.region}`,
  }));
  const film = [...videos].sort((a, b) => a.sort - b.sort || b.created_at.localeCompare(a.created_at))[0];
  if (spotlights.length < 3 && film) spotlights.push({ youtubeId: film.youtube_id, title: film.title, text: film.description, postId: "", url: `/films#film-${film.id}`, executive: false, label: "PAHAD film", by: "PAHAD" });
  const score = new Map<string, number>(), hubOf = new Map<string, string>();
  for (const c of cards) if (c.source === "user" && c.authorId && c.authorId !== viewer?.id) { score.set(c.authorId, (score.get(c.authorId) ?? 0) + 1 + c.supports + c.likes); if (!hubOf.has(c.authorId)) hubOf.set(c.authorId, PLUS_HUBS[c.hub].label); }
  const byId = new Map(users.map((u) => [u.id, u]));
  const creators = [...score].map(([id, n]) => ({ id, n, u: byId.get(id) })).filter((x) => x.u && x.u.status === "active")
    .sort((a, b) => Number(b.u!.account_type !== "individual") - Number(a.u!.account_type !== "individual") || b.n - a.n).slice(0, 10)
    .map((x) => ({ id: x.id, name: x.u!.name, hub: hubOf.get(x.id) ?? "", accountType: x.u!.account_type, following: v.followed.has(x.id) }));
  return { items, spotlights, creators, signedIn: Boolean(viewer) };
}

export async function appProfile(viewer: PlusViewer | null, id: string) {
  const u = await db.get("plus_users", id);
  if (!u || u.status !== "active") return null;
  const at = Date.now();
  const [posts, followers, following, mine] = await Promise.all([
    db.findBy("plus_posts", "author_id", u.id), db.findBy("plus_follows", "followee_id", u.id), db.findBy("plus_follows", "follower_id", u.id),
    viewer ? db.get("plus_follows", `${viewer.id}:${u.id}`) : null,
  ]);
  const self = viewer?.id === u.id;
  const hidden = u.private_mode && !self;
  const live = posts.filter((p) => isLivePlus(p, at) && !p.official).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const v = await viewerSets(viewer);
  const cards = hidden ? [] : (await withAuthentic(live.map(toCard))).map((c) => appCard(c, at, v, viewer?.id ?? ""));
  const badge = (await associateBadges()).get(u.id);
  const saves = !hidden && !u.hide_saved ? await db.findBy("plus_saves", "user_id", u.id) : [];
  const savedPosts = (await Promise.all(saves.slice(0, 12).map((s) => db.get("plus_posts", s.post_id))))
    .filter((p): p is NonNullable<typeof p> => Boolean(p && ["verified", "flag_proof"].includes(p.status) && isLivePlus(p, at)));
  const saved = (await withAuthentic(savedPosts.map(toCard))).map((c) => appCard(c, at, v, viewer?.id ?? ""));
  return {
    id: u.id, name: u.name, accountId: plusAccountId(u), accountType: ACCOUNT_TYPES[u.account_type as PlusAccountType] ?? "", member: Boolean(u.member_id),
    badge: badge ? AUTHOR_BADGE[badge] : "", privateMode: u.private_mode, self, following: Boolean(mine),
    counts: { posts: hidden ? null : live.length, supports: hidden ? null : live.reduce((n, p) => n + p.supports, 0), followers: followers.length, following: following.length },
    posts: cards, saved,
  };
}

export async function appMe(viewer: PlusViewer) {
  const at = Date.now();
  const [posts, myPasses, mySaves, notes, followers, following, blocks, users] = await Promise.all([
    db.findBy("plus_posts", "author_id", viewer.id), db.findBy("plus_passes", "user_id", viewer.id), db.findBy("plus_saves", "user_id", viewer.id),
    db.findBy("plus_notifications", "user_id", viewer.id), db.findBy("plus_follows", "followee_id", viewer.id), db.findBy("plus_follows", "follower_id", viewer.id),
    db.findBy("plus_blocks", "blocker_id", viewer.id), db.all("plus_users"),
  ]);
  const v = await viewerSets(viewer);
  const mine = (await withAuthentic(posts.filter((p) => p.status !== "removed").sort((a, b) => b.created_at.localeCompare(a.created_at)).map(toCard)))
    .map((c) => ({ ...appCard(c, at, v, viewer.id), status: posts.find((p) => p.id === c.id)?.status ?? "", live: isLivePlus(posts.find((p) => p.id === c.id)!, at) }));
  const passes = (await Promise.all(myPasses.filter((p) => p.status !== "cancelled").map(async (p) => ({ pass: p, post: await db.get("plus_posts", p.post_id) }))))
    .filter((r) => r.post)
    .map(({ pass, post }) => ({ code: pass.code, status: pass.status, holder: pass.holder_name, postId: post!.id, title: post!.title, startsAt: post!.starts_at, venue: isLivePlus(post!, at) ? post!.venue : "", region: post!.region }));
  const savedPosts = (await Promise.all(mySaves.map((s) => db.get("plus_posts", s.post_id)))).filter((p): p is NonNullable<typeof p> => Boolean(p && isLivePlus(p, at)));
  const saved = (await withAuthentic(savedPosts.map(toCard))).map((c) => appCard(c, at, v, viewer.id));
  const seller = viewer.account_type === "business" || viewer.account_type === "organisation";
  const [organiser, feePercent] = seller ? await Promise.all([db.get("plus_organisers", viewer.id), getFeePercent()]) : [null, 0];
  const sales = organiser?.status === "approved" ? await Promise.all(posts.filter((p) => p.price > 0).map(async (p) => ({ postId: p.id, title: p.title, ...(await eventMoney(p.id)) }))) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));
  return {
    profile: {
      id: viewer.id, name: viewer.name, email: viewer.email, phone: viewer.phone, accountType: viewer.account_type, accountTypeLabel: ACCOUNT_TYPES[viewer.account_type as PlusAccountType] ?? "",
      accountId: plusAccountId(viewer), emailVerified: viewer.email_verified, member: Boolean(viewer.member_id), instagram: viewer.instagram, contactEmail: viewer.contact_email, createdAt: viewer.created_at,
    },
    settings: { hide_contacts: viewer.hide_contacts, private_mode: viewer.private_mode, hide_saved: viewer.hide_saved, mute_support: viewer.mute_support, mute_events: viewer.mute_events },
    counts: { followers: followers.length, following: following.length, posts: mine.length },
    posts: mine,
    passes,
    saved,
    notifications: notes.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50).map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, url: n.url, read: n.read, createdAt: n.created_at })),
    unread: notes.filter((n) => !n.read).length,
    blocked: blocks.map((b) => ({ id: b.blocked_id, name: names.get(b.blocked_id) ?? "Account" })),
    organiser: seller ? { status: organiser?.status ?? "none", note: organiser?.note ?? "", feePercent, paymentsConfigured, sales } : null,
  };
}

export async function appPass(viewer: PlusViewer, code: string) {
  const pass = (await db.findBy("plus_passes", "code", code))[0];
  if (!pass) return null;
  const post = await db.get("plus_posts", pass.post_id);
  if (!post) return null;
  const gate = await gateAccess(post);
  if (pass.user_id !== viewer.id && !gate?.canAct) return null;
  return {
    code: pass.code, status: pass.status, holder: pass.holder_name, checkedInAt: pass.checked_in_at, createdAt: pass.created_at, paid: Boolean(pass.order_id),
    post: { id: post.id, title: post.title, startsAt: post.starts_at, endsAt: post.ends_at, venue: post.venue, region: post.region, locality: post.locality, image: post.image, price: post.price },
    mine: pass.user_id === viewer.id,
  };
}

export async function appCheckin(postId: string) {
  const post = await db.get("plus_posts", postId);
  if (!post) return null;
  const gate = await gateAccess(post);
  if (!gate?.canAct) return null;
  const passes = (await db.findBy("plus_passes", "post_id", postId)).filter((p) => p.status !== "cancelled");
  return {
    post: { id: post.id, title: post.title, startsAt: post.starts_at, approval: post.pass_mode === "approval", capacity: post.pass_capacity, price: post.price },
    passes: passes.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((p) => ({ code: p.code, holder: p.holder_name, status: p.status, checkedInAt: p.checked_in_at, paid: Boolean(p.order_id) })),
    counts: { total: passes.length, checkedIn: passes.filter((p) => p.status === "checked_in").length, pending: passes.filter((p) => p.status === "pending").length },
  };
}

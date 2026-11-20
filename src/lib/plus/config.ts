/**
 * PAHAD+ — the public community app (opens at /plus). Shared by server and client code:
 * hubs, regions, Brief types and the regulation rules agreed with the President.
 */

export type PlusHub = "events" | "roam" | "business" | "briefs";
export const PLUS_HUBS: Record<PlusHub, { label: string; emoji: string; blurb: string }> = {
  events: { label: "Events", emoji: "🎪", blurb: "Gatherings, competitions, programmes and workshops" },
  roam: { label: "Roam", emoji: "🏔️", blurb: "Scenic spots, eco-trails, viewpoints and heritage homestays" },
  business: { label: "Business", emoji: "🍵", blurb: "Local enterprises, collectives, cafés and artisan shops" },
  briefs: { label: "Briefs", emoji: "📰", blurb: "Alerts, opportunities, jobs and local tips" },
};
export const HUB_KEYS = Object.keys(PLUS_HUBS) as PlusHub[];

export const PLUS_REGIONS = ["Darjeeling", "Kalimpong", "Siliguri", "Sikkim"] as const;
export type PlusRegion = (typeof PLUS_REGIONS)[number];

/** Brief types PP users can post. "policy" is generated only from circulars PAHAD approved as public. */
export type BriefType = "alert" | "opportunity" | "job" | "tip" | "policy";
export const BRIEF_TYPES: Record<BriefType, { label: string; emoji: string }> = {
  alert: { label: "Civic & Road Alert", emoji: "⚠️" },
  opportunity: { label: "Opportunities & Grants", emoji: "🎓" },
  job: { label: "Jobs", emoji: "💼" },
  tip: { label: "Community Guidelines & Tips", emoji: "🌿" },
  policy: { label: "Policy & Assembly Summaries", emoji: "🏛️" },
};
export const USER_BRIEF_TYPES: BriefType[] = ["alert", "opportunity", "job", "tip"];

export const ROAM_KINDS = ["Tourist spot", "Viewpoint", "Eco-trail", "Heritage homestay", "Heritage / cultural site", "Other"] as const;
export const ROAM_STAGES = { open: "Open to visitors", developing: "Being developed" } as const;

export type PlusAccountType = "individual" | "business" | "organisation";
export const ACCOUNT_TYPES: Record<PlusAccountType, string> = {
  individual: "Individual",
  business: "Business",
  organisation: "Organisation",
};

/**
 * unverified: live with limited information, waiting in the verification queue
 * verified / flag_proof: full information; flag_proof (President only) can't be held by flags
 * hold: hidden (3 reports, or a verifier paused it); rejected: hidden, reason shown to the poster
 * removed: the poster deleted it or their account
 */
export type PlusStatus = "unverified" | "verified" | "flag_proof" | "hold" | "rejected" | "removed";

/** Regulation rules. Change them here only. */
export const PLUS_RULES = {
  /** Community reports that put a post on hold (flag-proof posts are never held). */
  flagsToHold: 3,
  /** Unverified posts drop out of the feed after this many days if nobody verifies them. */
  unverifiedDays: 14,
  /** Civic & Road Alerts: default and longest life. */
  alertDefaultHours: 48,
  alertMaxDays: 7,
  /** Posting limits: accounts younger than newAccountDays get the lower daily limit. */
  newAccountDays: 30,
  newAccountDailyPosts: 3,
  dailyPosts: 10,
  /** One-time links. */
  verifyLinkHours: 48,
  resetLinkMinutes: 30,
} as const;

export const PLUS_PATH = "/plus";

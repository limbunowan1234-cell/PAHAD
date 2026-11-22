/** Shapes returned by pahad.org/api/app/v1 (see src/lib/plus/app-api.ts on the website). */

export type Hub = "events" | "roam" | "business" | "briefs";
export type Tab = "community" | "following" | "foryou" | "pahad";
export type Trust = "pahad" | "flag_proof" | "verified" | "unverified";

export type Card = {
  id: string;
  source: "user" | "pahad";
  open: "post" | "circular" | "web";
  href: string;
  hub: Hub;
  hubKey: string;
  hubLabel: string;
  emoji: string;
  briefType: string;
  kind: string;
  region: string;
  locality: string;
  title: string;
  summary: string;
  image: string;
  youtubeId: string;
  videoUrl: string;
  trust: Trust;
  verified: boolean;
  authentic: boolean;
  authorBadge: string;
  author: string;
  authorId: string;
  authorMember: boolean;
  canFollow: boolean;
  following: boolean;
  likes: number;
  liked: boolean;
  saved: boolean;
  supports: number;
  supported: boolean;
  flags: number;
  contactsUnverified: boolean;
  pass: string;
  cta: { label: string; url: string; external: boolean };
  when: string;
  alert: boolean;
  createdAt: string;
  status?: string;
  live?: boolean;
};

export type Locked = {
  venue: string; organiser: string; phone: string; whatsapp: string; email: string; instagram: string; address: string; website: string; link: string; mapLink: string; regId: string;
} | null;

export type PassState = "none" | "holding" | "unverified" | "closed" | "soldout" | "paused" | "buy" | "free" | "signin";

export type PostDetail = {
  card: Card;
  body: string;
  stage: string;
  bestSeason: string;
  hours: string;
  startsAt: string;
  endsAt: string;
  deadline: string;
  locked: Locked;
  live: boolean;
  mine: boolean;
  statusNote: string;
  status: string;
  verifiedByPahad: boolean;
  pass: null | {
    state: PassState; label: string; price: number; approval: boolean; left: number | null; capacity: number;
    myCode: string; myStatus: string; canCheckIn: boolean; registrations: number | null;
  };
};

export type Config = {
  hubs: { key: Hub; label: string; emoji: string; blurb: string }[];
  regions: string[];
  briefTypes: { key: string; label: string; emoji: string; userCanPost: boolean }[];
  roamKinds: string[];
  roamStages: { key: string; label: string }[];
  accountTypes: { key: string; label: string }[];
  rules: { flagsToHold: number; alertDefaultHours: number; alertMaxDays: number; dailyPosts: number; newAccountDailyPosts: number };
  paymentsConfigured: boolean;
  links: { terms: string; privacy: string; deleteAccount: string; help: string };
};

export type Discover = {
  items: Card[];
  spotlights: { youtubeId: string; title: string; text: string; postId: string; url: string; executive: boolean; by: string; label: string }[];
  creators: { id: string; name: string; hub: string; accountType: string; following: boolean }[];
  signedIn: boolean;
};

export type Profile = {
  id: string; name: string; accountId: string; accountType: string; member: boolean; badge: string; privateMode: boolean; self: boolean; following: boolean;
  counts: { posts: number | null; supports: number | null; followers: number; following: number };
  posts: Card[];
  saved: Card[];
};

export type MyPass = { code: string; status: string; holder: string; postId: string; title: string; startsAt: string; venue: string; region: string };
export type Note = { id: string; kind: string; title: string; body: string; url: string; read: boolean; createdAt: string };

export type Me = {
  profile: { id: string; name: string; email: string; phone: string; accountType: string; accountTypeLabel: string; accountId: string; emailVerified: boolean; member: boolean; instagram: string; contactEmail: string; createdAt: string };
  settings: Record<"hide_contacts" | "private_mode" | "hide_saved" | "mute_support" | "mute_events", boolean>;
  counts: { followers: number; following: number; posts: number };
  posts: Card[];
  passes: MyPass[];
  saved: Card[];
  notifications: Note[];
  unread: number;
  blocked: { id: string; name: string }[];
  organiser: null | { status: string; note: string; feePercent: number; paymentsConfigured: boolean; sales: { postId: string; title: string; [k: string]: unknown }[] };
};

export type PassView = {
  code: string; status: string; holder: string; checkedInAt: string; createdAt: string; paid: boolean; mine: boolean;
  post: { id: string; title: string; startsAt: string; endsAt: string; venue: string; region: string; locality: string; image: string; price: number };
};

export type CheckinView = {
  post: { id: string; title: string; startsAt: string; approval: boolean; capacity: number; price: number };
  passes: { code: string; holder: string; status: string; checkedInAt: string; paid: boolean }[];
  counts: { total: number; checkedIn: number; pending: number };
};

export type Circular = { id: string; number: string; title: string; body: string; issuedBy: string; createdAt: string };

/** Every write returns this (toggles add on/count; posting adds redirect). */
export type Result = { ok: boolean; message: string; on?: boolean; count?: number; redirect?: string; token?: string; signIn?: boolean; name?: string; at?: string; [k: string]: unknown };

/** Access levels from the PAHAD Admin Panel Master Instruction Chart (LA–L6 + SYS). */
export type Role =
  | "super_admin" // L1 A President (the owner account is also LA Founder-Owner)
  | "general_secretary" // L1 B
  | "joint_secretary" // L1 C Joint / Additional Secretary
  | "treasurer" // L1 D Treasury
  | "gb_member" // L1 E Additional Member of the Governing Body (max 5 active)
  | "admin" // L2 E1 Chief Executive Director
  | "executive_secretary" // L2 E2
  | "record_officer" // L2 E3
  | "directorate_head" // L3 D0 Managing Director (scoped to a Directorate)
  | "department_head" // L4 D1 Department Head (scoped to a Department)
  | "project_coordinator" // L5-1 Project Coordinator (scoped to a Programme)
  | "editor" // L6 Member of the General Assembly
  | "creator" // C1 Creator: an artist who submits videos (no voting rights)
  | "honorary" // H1 Honorary Member: advises and trains, non-binding (no voting rights)
  | "sysadmin"; // SYS Website Administrator: sees everything read-only, decides nothing

export type UnitKind = "directorate" | "department" | "programme" | "project" | "designation" | "district" | "subdivision" | "block" | "gp";

/** Organisational and geographical structure, managed in Admin → Structure. */
export type Unit = {
  id: string;
  kind: UnitKind;
  name: string;
  parent_id: string;
  /** Off = hidden/dormant without deleting anything. */
  active: boolean;
  /** Projects: active, completed or archived. */
  status: string;
  sort: number;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Title shown with the name (Founder, President, Website Head…). Only a label. */
  designation: string;
  /** Directorate unit id (L3 scope). */
  directorate: string;
  /** Department or Programme unit id (L4 / L5 scope). */
  unit: string;
  /** Geographical tag: District, Subdivision, Block or GP/Ward unit id (G1–G4). */
  geo: string;
  /** Permanent owner (the bootstrapped Founder/President): cannot be removed, demoted or deactivated. */
  owner: boolean;
  /** Finance access set by the Governing Body; empty = default for the role. */
  finance: string;
  /** YouTube Embed Submission Permission, granted or revoked by the President only. */
  can_submit_videos: boolean;
  /** PAHAD+ verifier, granted by the President. plus_region "" = every region. */
  can_verify_plus: boolean;
  plus_region: string;
  /** May approve internal → public and organisation posts for PAHAD+, granted by the President. */
  can_approve_public: boolean;
  /** PAHAD+ verifier the President also allowed to make posts Flag-Proof (protected from community flags). */
  can_flagproof_plus: boolean;
  /** Allowed by the President to edit the website menu and pages (L1 always can). */
  can_manage_menu: boolean;
  active: boolean;
  password_hash: string;
  created_at: string;
  last_login: string | null;
};
export type PublicUser = Omit<User, "password_hash">;

export type PostType = "news" | "event" | "programme" | "resource" | "document" | "training";
export type PostStatus = "draft" | "pending" | "published";
/** Who can read a published post. "" (older posts) counts as public. "internal" = admins only, inside the dashboard. */
export type PostVisibility = "public" | "members" | "internal";

export type Post = {
  id: string;
  type: PostType;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover: string;
  category: string;
  event_date: string;
  location: string;
  /** Attachment such as a PDF or poster (uploaded, or a Google Drive link). */
  file_url: string;
  /** Registration or application form, e.g. a Google Form link. */
  form_url: string;
  directorate: string;
  /** Department or Programme the item belongs to (optional). */
  unit: string;
  status: PostStatus;
  /** Public, or Members Only (signed-in accounts). */
  visibility: PostVisibility | "";
  /** Shown in PAHAD+ (the PAHAD tab and feed): set only by the President or an assigned approver. */
  plus_approved: boolean;
  /** Training Material only: "" = all members, "executive" = L1–L2, "governing_body" = L1. */
  audience: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  published_at: string;
};

export type MemberStatus = "applicant" | "active" | "inactive" | "rejected";
export type Member = {
  id: string;
  member_no: string;
  name: string;
  email: string;
  phone: string;
  area: string;
  address: string;
  occupation: string;
  category: string;
  /** Former DSSCOLONY member: a separate yes/no, no longer a category. */
  former_dsscolony: boolean;
  interests: string;
  status: MemberStatus;
  source: "admin" | "website";
  notes: string;
  added_by: string;
  directorate: string;
  unit: string;
  /** G4 GP/Ward (or any geo unit). */
  geo: string;
  created_at: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type Task = {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string;
  priority: "low" | "normal" | "high";
  status: TaskStatus;
  /** Governing Body meeting this follow-up came from, if any. */
  meeting_id: string;
  created_at: string;
  updated_at: string;
};

/** Governing Body meeting (GBM). The General Secretary drafts; the President approves. */
export type DraftStatus = "draft" | "submitted" | "approved";
export type Meeting = {
  id: string;
  title: string;
  meeting_date: string;
  start_time: string;
  venue: string;
  status: "scheduled" | "held" | "cancelled";
  agenda: string;
  agenda_status: DraftStatus;
  agenda_approved_by: string;
  notice: string;
  notice_issued_at: string;
  minutes: string;
  minutes_status: DraftStatus;
  minutes_approved_by: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type Vote = { by: string; name: string; vote: "for" | "against" | "abstain"; at: string };
export type Resolution = {
  id: string;
  meeting_id: string;
  number: string;
  title: string;
  body: string;
  status: "proposed" | "ratified" | "rejected";
  /** JSON array of Vote. */
  votes: string;
  decided_by_name: string;
  decided_at: string;
  created_by_name: string;
  created_at: string;
};

export type CircularAudience = "general_assembly" | "governing_body" | "executive" | "all";
export type Circular = {
  id: string;
  number: string;
  title: string;
  body: string;
  audience: CircularAudience;
  /** "" = internal (dashboard only). "public" once the President or an assigned approver approved it. */
  visibility: string;
  /** Optional geographical unit: only people inside it receive the circular. */
  geo: string;
  /** Meeting this notice is about, if any. */
  meeting_id: string;
  issued_by: string;
  issued_by_name: string;
  created_at: string;
};

export type SubmissionKind = "contact" | "idea" | "volunteer" | "collaborate" | "knowledge";
export type Submission = {
  id: string;
  kind: SubmissionKind;
  name: string;
  email: string;
  phone: string;
  organisation: string;
  message: string;
  status: "new" | "in_progress" | "closed";
  created_at: string;
};

export type Partner = {
  id: string;
  name: string;
  role: string;
  url: string;
  logo: string;
  description: string;
  dark_logo: boolean;
  sort: number;
  created_at: string;
};

export type Media = {
  id: string;
  url: string;
  caption: string;
  album: string;
  uploaded_by: string;
  created_at: string;
};

export const TEAM_SECTIONS = [
  "Governing Body",
  "Executive Body",
  "Secretariat",
  "Directorate",
  "Department",
  "Geographical Unit",
  "Associates",
] as const;
export type TeamSection = (typeof TEAM_SECTIONS)[number];

/** Website pages that can show videos and featured content (see lib/placements.ts). */
export type PageKey =
  | "home" | "about" | "our-work" | "programmes" | "knowledge" | "news" | "events" | "gallery" | "get-involved" | "membership" | "partners";
export type CustomPagePlacementKey = `custom:${string}`;
export type PagePlacementKey = PageKey | CustomPagePlacementKey;

export type VideoStatus = "pending" | "approved" | "rejected";
/** A YouTube video shown through an embed. Video files are never uploaded. */
export type Video = {
  id: string;
  /** 11-character YouTube video id, validated on save. */
  youtube_id: string;
  title: string;
  description: string;
  /** Comma-separated PageKeys where the video appears. */
  pages: string;
  status: VideoStatus;
  /** Central ON/OFF switch: off hides it from every page without deleting it. */
  visible: boolean;
  sort: number;
  submitted_by: string;
  submitted_by_name: string;
  reviewed_by_name: string;
  review_note: string;
  created_at: string;
  updated_at: string;
};

export type FeaturedKind = "post" | "video" | "person" | "announcement";
/** A highlighted item, placed on pages from Admin → Featured. */
export type Featured = {
  id: string;
  kind: FeaturedKind;
  /** Post, video or team member id (empty for announcements). */
  ref_id: string;
  /** Announcement text, or an override for the linked item's title / summary. */
  title: string;
  text: string;
  link: string;
  image: string;
  pages: string;
  active: boolean;
  sort: number;
  /** Optional YYYY-MM-DD window (inclusive, India time). */
  starts_on: string;
  ends_on: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

/**
 * One-time password reset link. `id` is the SHA-256 hash of the token in the emailed link,
 * so the link itself is never stored. Valid for 30 minutes, once.
 */
export type PasswordReset = { id: string; user_id: string; expires_at: string; used: boolean; created_at: string };

// ------------------------------------------------------------------ PAHAD+ (public app, /plus)
/** A PAHAD Plus User: a public app user, never an organisational member or a dashboard account. */
export type PlusUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  account_type: string;
  password_hash: string;
  email_verified: boolean;
  terms_accepted_at: string;
  status: "active" | "suspended";
  created_at: string;
  last_login: string;
  /** Linked PAHAD membership (members.id), confirmed by email. Only shows a "PAHAD member" badge: no member access. */
  member_id: string;
  suspend_reason: string;
  suspended_by: string;
  /** Collaboration contacts used to prefill posts (shown only where the person switches them on). */
  instagram: string;
  contact_email: string;
  /** Settings (stored as "off" switches so existing accounts keep the defaults). */
  hide_contacts: boolean;
  private_mode: boolean;
  hide_saved: boolean;
  mute_support: boolean;
  mute_events: boolean;
  /** Access type: a PAHAD dashboard account linked to this app account (proved by signing in to both). */
  admin_user_id: string;
  admin_mode: boolean;
};
/** One-time link for a PP user. id = SHA-256 of the token in the link. data: e.g. the member id for "link". */
export type PlusToken = { id: string; user_id: string; kind: "verify" | "reset" | "link"; expires_at: string; used: boolean; created_at: string; data: string };
export type PlusPost = {
  id: string;
  hub: string;
  brief_type: string;
  /** Roam: kind of place. */
  kind: string;
  /** Roam: "open" or "developing". */
  stage: string;
  region: string;
  locality: string;
  title: string;
  summary: string;
  body: string;
  image: string;
  youtube_id: string;
  starts_at: string;
  ends_at: string;
  // Locked until verified ↓
  venue: string;
  organiser: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_instagram: string;
  address: string;
  website: string;
  /** Register / apply / source link. */
  link: string;
  map_link: string;
  /** Business: registration / licence number (optional). */
  reg_id: string;
  // ↑
  /** The poster chose to show phone, WhatsApp, Instagram, email and address before verification. */
  show_contacts: boolean;
  /** A direct video file link (https .mp4 / .webm), as an alternative to YouTube. */
  video_url: string;
  /** Events: "" = E-Passes issued instantly, "approval" = they start Pending until the organiser or PAHAD approves. */
  pass_mode: string;
  /** Posted from the app by a PAHAD admin as a regulated circular. */
  official: boolean;
  /** Picked by PAHAD for the Discover "Executive Spotlight". */
  spotlight: boolean;
  best_season: string;
  hours: string;
  valid_until: string;
  deadline: string;
  status: string;
  flags: number;
  verified_by_name: string;
  verified_at: string;
  reject_reason: string;
  author_id: string;
  author_name: string;
  author_type: string;
  /** The poster has a linked PAHAD membership. */
  author_member: boolean;
  /** Events: free E-Passes offered by the organiser; capacity 0 = no limit. */
  pass_enabled: boolean;
  pass_capacity: number;
  /** Paid E-Pass price in paise (0 = free). Only approved paid organisers, fixed when posted. */
  price: number;
  likes: number;
  /** People who vouch the post is genuine ("Support"). Helps verifiers. */
  supports: number;
  created_at: string;
  updated_at: string;
};
/**
 * A free E-Pass for an event. id = `${post_id}:${user_id}` (one per person per event);
 * code = the random code in the QR, shown at the gate.
 */
export type PlusPass = {
  id: string;
  code: string;
  post_id: string;
  user_id: string;
  holder_name: string;
  status: "pending" | "active" | "cancelled" | "revoked" | "checked_in";
  checked_in_at: string;
  checked_in_by: string;
  reminded: boolean;
  /** Paid passes: the plus_orders id. */
  order_id: string;
  created_at: string;
};
/**
 * Paid organisers: Business / Organisation accounts the President approves to sell E-Passes. id = the PP user id.
 * Payout details are seen only by the President (PAHAD collects payments and pays organisers out).
 */
export type PlusOrganiser = {
  id: string;
  account_name: string;
  upi: string;
  bank_account: string;
  ifsc: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  note: string;
  requested_at: string;
  decided_by_name: string;
  decided_at: string;
};
/** One Razorpay payment attempt for a paid E-Pass. Amounts in paise; fee = PAHAD's fee at the time of sale. */
export type PlusOrder = {
  id: string;
  rzp_order_id: string;
  rzp_payment_id: string;
  post_id: string;
  user_id: string;
  holder_name: string;
  amount: number;
  fee: number;
  status: "created" | "paid" | "refunded";
  pass_id: string;
  refund_id: string;
  created_at: string;
  paid_at: string;
  refunded_at: string;
};
/** A payout PAHAD made to an organiser for an event (bank transfer / UPI done outside the app). */
export type PlusPayout = { id: string; post_id: string; organiser_id: string; amount: number; reference: string; paid_by_name: string; paid_at: string };
/** In-app notifications for PAHAD+ accounts (also sent as push when switched on). */
export type PlusNotification = { id: string; user_id: string; kind: "verify" | "support" | "events" | "account"; title: string; body: string; url: string; read: boolean; created_at: string };
/** id = `${follower_id}:${followee_id}`. */
export type PlusFollow = { id: string; follower_id: string; followee_id: string; created_at: string };
/** One per user per post: id = `${post_id}:${user_id}`. */
export type PlusSupport = { id: string; post_id: string; user_id: string; created_at: string };
/** id = `${post_id}:${user_id}`. */
export type PlusLike = { id: string; post_id: string; user_id: string; created_at: string };
export type PlusSave = { id: string; post_id: string; user_id: string; created_at: string };
/** A phone/browser that asked for PAHAD+ notifications. id = SHA-256 of the endpoint. regions: comma-separated, "" = none. */
export type PlusPushSub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; regions: string; created_at: string };
/** One report per PP user per post: id = `${post_id}:${user_id}`. */
export type PlusFlag = { id: string; post_id: string; user_id: string; reason: string; created_at: string };
/** id = `${blocker_id}:${blocked_id}`. */
export type PlusBlock = { id: string; blocker_id: string; blocked_id: string; created_at: string };

/**
 * Requests the President (or an approver he assigns) must decide:
 *  make_public: an internal post or circular → public; plus_feature: a PAHAD post → shown in PAHAD+.
 */
export type Approval = {
  id: string;
  kind: "make_public" | "plus_feature";
  entity: "post" | "circular";
  entity_id: string;
  title: string;
  /** make_public on a post: the visibility asked for ("public" or "members"). */
  target: string;
  status: "pending" | "approved" | "rejected";
  requested_by: string;
  requested_by_name: string;
  decided_by_name: string;
  note: string;
  created_at: string;
  decided_at: string;
};

/** Voting categories: Governing Body (L1), Executive Body (L2) and General Assembly. */
export type PollCategory = "gb" | "eb" | "ga";
export type PollStatus = "draft" | "active" | "paused" | "closed";
/** Who may see results: dashboard only, eligible members after closing, or public (after authorisation). */
export type PollResultsVisibility = "admin" | "after_close" | "public";
export type PollOption = { id: string; label: string };
export type Poll = {
  id: string;
  category: PollCategory;
  title: string;
  description: string;
  /** JSON array of PollOption. Locked once anyone has voted. */
  options: string;
  /** ISO times. Voting is open only while status is active and now is between them. */
  opens_at: string;
  closes_at: string;
  status: PollStatus;
  results_visibility: PollResultsVisibility;
  /** For "public": results show on the website only after this is switched on. */
  public_authorized: boolean;
  archived: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};
/** Voter-eligibility register. id = `${poll_id}:${user_id}`. */
export type PollVoter = { id: string; poll_id: string; user_id: string; user_name: string; created_at: string };
/**
 * "Has voted" receipt. id = `${poll_id}:${user_id}`, so the database itself rejects a second vote.
 * It records THAT someone voted, never their choice.
 */
export type PollReceipt = { id: string; poll_id: string; user_id: string; created_at: string };
/** Anonymous ballot: the choice only, with no voter and no timestamp of its own. */
export type Ballot = { id: string; poll_id: string; option_id: string; created_at: string };

export type TeamMember = {
  id: string;
  name: string;
  section: TeamSection;
  subtitle: string;
  detail: string;
  tag: string;
  profile_url: string;
  profile_label: string;
  designation: string;
  department: string;
  /** Additional work beyond the main role; hidden on the site when empty. */
  additional_charge: string;
  /** Profile picture: a Google Drive share link or any image URL. */
  photo_url: string;
  sort: number;
  created_at: string;
};

export type CustomPageFormat = "standard" | "html";

/** A page created from Admin → Pages: standard pages use /<slug>, HTML pages use /pages/<slug>. */
export type CustomPage = {
  id: string;
  slug: string;
  format: CustomPageFormat;
  title: string;
  /** Small label above the title, e.g. "Media". */
  eyebrow: string;
  intro: string;
  body: string;
  cover: string;
  /** Also list published posts whose category / label matches this (e.g. "Feature"). */
  collect: string;
  status: "published" | "draft";
  updated_by: string;
  created_at: string;
  updated_at: string;
};

/** One phrase of website text and its Nepali version (Admin → Nepali translation). */
export type Translation = {
  id: string;
  en: string;
  ne: string;
  /** "machine" = Google's first draft, "human" = checked or written by PAHAD, "keep" = leave in English. */
  source: "machine" | "human" | "keep" | "";
  page: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

/** Small key/value settings, e.g. "hero:about" → image URL. */
export type Setting = {
  id: string;
  value: string;
  updated_by: string;
  created_at: string;
};

export type Activity = {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  summary: string;
  /** JSON {before, after} for sensitive actions. */
  details: string;
  /** Directorate of the person who acted, so Directorate Heads see their own area. */
  directorate: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
};

export type FinanceType = "income" | "expense" | "donation" | "dues";
export type FinanceStatus = "submitted" | "approved" | "rejected" | "deleted";
export type FinanceApproval = { by: string; name: string; role: Role; decision: "approved" | "rejected"; note: string; at: string };

export type FinanceEntry = {
  id: string;
  entry_no: string;
  type: FinanceType;
  /** Amount in rupees, stored as text with two decimals. */
  amount: string;
  entry_date: string;
  description: string;
  receipt_url: string;
  submitted_by: string;
  submitted_by_name: string;
  status: FinanceStatus;
  /** JSON array of FinanceApproval. */
  approvals: string;
  locked: boolean;
  /** Whether the latest change reached the Google Sheet. */
  synced: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceRequestKind = "edit" | "delete" | "export";
export type FinanceRequest = {
  id: string;
  entry_id: string;
  kind: FinanceRequestKind;
  /** JSON: proposed changes (edit), reason (delete) or filters (export). */
  payload: string;
  requested_by: string;
  requested_by_name: string;
  status: "pending" | "approved" | "rejected" | "used";
  decided_by_name: string;
  created_at: string;
};

/** Writes to Google Sheets/Drive waiting to be retried. */
export type OutboxItem = {
  id: string;
  action: string;
  payload: string;
  attempts: number;
  last_error: string;
  created_at: string;
};

export type Tables = {
  users: User;
  posts: Post;
  members: Member;
  tasks: Task;
  submissions: Submission;
  partners: Partner;
  media: Media;
  team: TeamMember;
  settings: Setting;
  activity: Activity;
  notifications: Notification;
  units: Unit;
  meetings: Meeting;
  resolutions: Resolution;
  circulars: Circular;
  finance: FinanceEntry;
  finance_requests: FinanceRequest;
  outbox: OutboxItem;
  videos: Video;
  featured: Featured;
  polls: Poll;
  poll_voters: PollVoter;
  poll_receipts: PollReceipt;
  ballots: Ballot;
  password_resets: PasswordReset;
  plus_users: PlusUser;
  plus_tokens: PlusToken;
  plus_posts: PlusPost;
  plus_flags: PlusFlag;
  plus_blocks: PlusBlock;
  approvals: Approval;
  plus_passes: PlusPass;
  plus_likes: PlusLike;
  plus_saves: PlusSave;
  plus_push: PlusPushSub;
  plus_organisers: PlusOrganiser;
  plus_orders: PlusOrder;
  plus_payouts: PlusPayout;
  plus_follows: PlusFollow;
  plus_supports: PlusSupport;
  plus_notifications: PlusNotification;
  pages: CustomPage;
  translations: Translation;
};
export type TableName = keyof Tables;

import { LEGACY_MEMBER_CATEGORIES } from "../membership";
import type { TableName } from "../types";

type ColType = "text" | "bool" | "int";

/** Column registry: used to whitelist columns in generated SQL and to build the DDL. */
export const SCHEMA: Record<TableName, Record<string, ColType>> = {
  users: {
    id: "text", email: "text", name: "text", role: "text", designation: "text", directorate: "text", unit: "text", geo: "text",
    owner: "bool", finance: "text", can_submit_videos: "bool", can_manage_menu: "bool", can_verify_plus: "bool", plus_region: "text", can_approve_public: "bool", can_flagproof_plus: "bool", active: "bool", password_hash: "text", created_at: "text", last_login: "text",
  },
  posts: {
    id: "text", type: "text", title: "text", slug: "text", excerpt: "text", body: "text",
    cover: "text", category: "text", event_date: "text", location: "text", file_url: "text", form_url: "text", directorate: "text", unit: "text",
    status: "text", visibility: "text", plus_approved: "bool", audience: "text", author_id: "text", author_name: "text", created_at: "text",
    updated_at: "text", published_at: "text",
  },
  members: {
    id: "text", member_no: "text", name: "text", email: "text", phone: "text", area: "text",
    address: "text", occupation: "text", category: "text", former_dsscolony: "bool", interests: "text", status: "text",
    source: "text", notes: "text", added_by: "text", directorate: "text", unit: "text", geo: "text", created_at: "text",
  },
  tasks: {
    id: "text", title: "text", description: "text", assigned_to: "text", assigned_by: "text",
    due_date: "text", priority: "text", status: "text", meeting_id: "text", created_at: "text", updated_at: "text",
  },
  meetings: {
    id: "text", title: "text", meeting_date: "text", start_time: "text", venue: "text", status: "text",
    agenda: "text", agenda_status: "text", agenda_approved_by: "text", notice: "text", notice_issued_at: "text",
    minutes: "text", minutes_status: "text", minutes_approved_by: "text", created_by: "text", created_by_name: "text",
    created_at: "text", updated_at: "text",
  },
  resolutions: {
    id: "text", meeting_id: "text", number: "text", title: "text", body: "text", status: "text", votes: "text",
    decided_by_name: "text", decided_at: "text", created_by_name: "text", created_at: "text",
  },
  circulars: {
    id: "text", number: "text", title: "text", body: "text", audience: "text", visibility: "text", geo: "text", meeting_id: "text",
    issued_by: "text", issued_by_name: "text", created_at: "text",
  },
  submissions: {
    id: "text", kind: "text", name: "text", email: "text", phone: "text", organisation: "text",
    message: "text", status: "text", created_at: "text",
  },
  partners: {
    id: "text", name: "text", role: "text", url: "text", logo: "text", description: "text",
    dark_logo: "bool", sort: "int", created_at: "text",
  },
  media: { id: "text", url: "text", caption: "text", album: "text", uploaded_by: "text", created_at: "text" },
  team: {
    id: "text", name: "text", section: "text", designation: "text", department: "text",
    additional_charge: "text", photo_url: "text", sort: "int", created_at: "text",
  },
  settings: { id: "text", value: "text", updated_by: "text", created_at: "text" },
  activity: {
    id: "text", actor_id: "text", actor_name: "text", action: "text", entity: "text",
    entity_id: "text", summary: "text", details: "text", directorate: "text", created_at: "text",
  },
  units: { id: "text", kind: "text", name: "text", parent_id: "text", active: "bool", status: "text", sort: "int", created_at: "text" },
  notifications: { id: "text", user_id: "text", message: "text", link: "text", read: "bool", created_at: "text" },
  finance: {
    id: "text", entry_no: "text", type: "text", amount: "text", entry_date: "text", description: "text",
    receipt_url: "text", submitted_by: "text", submitted_by_name: "text", status: "text", approvals: "text",
    locked: "bool", synced: "bool", created_at: "text", updated_at: "text",
  },
  finance_requests: {
    id: "text", entry_id: "text", kind: "text", payload: "text", requested_by: "text", requested_by_name: "text",
    status: "text", decided_by_name: "text", created_at: "text",
  },
  outbox: { id: "text", action: "text", payload: "text", attempts: "int", last_error: "text", created_at: "text" },
  videos: {
    id: "text", youtube_id: "text", title: "text", description: "text", pages: "text", status: "text", visible: "bool", sort: "int",
    submitted_by: "text", submitted_by_name: "text", reviewed_by_name: "text", review_note: "text", created_at: "text", updated_at: "text",
  },
  polls: {
    id: "text", category: "text", title: "text", description: "text", options: "text", opens_at: "text", closes_at: "text",
    status: "text", results_visibility: "text", public_authorized: "bool", archived: "bool",
    created_by: "text", created_by_name: "text", created_at: "text", updated_at: "text",
  },
  poll_voters: { id: "text", poll_id: "text", user_id: "text", user_name: "text", created_at: "text" },
  poll_receipts: { id: "text", poll_id: "text", user_id: "text", created_at: "text" },
  ballots: { id: "text", poll_id: "text", option_id: "text", created_at: "text" },
  password_resets: { id: "text", user_id: "text", expires_at: "text", used: "bool", created_at: "text" },
  plus_users: {
    id: "text", email: "text", name: "text", phone: "text", account_type: "text", password_hash: "text", email_verified: "bool",
    terms_accepted_at: "text", status: "text", created_at: "text", last_login: "text", member_id: "text", suspend_reason: "text", suspended_by: "text", instagram: "text", contact_email: "text", hide_contacts: "bool", private_mode: "bool", hide_saved: "bool", mute_support: "bool", mute_events: "bool", admin_user_id: "text", admin_mode: "bool",
  },
  plus_tokens: { id: "text", user_id: "text", kind: "text", expires_at: "text", used: "bool", created_at: "text", data: "text" },
  plus_posts: {
    id: "text", hub: "text", brief_type: "text", kind: "text", stage: "text", region: "text", locality: "text", title: "text",
    summary: "text", body: "text", image: "text", youtube_id: "text", starts_at: "text", ends_at: "text", venue: "text",
    organiser: "text", contact_phone: "text", contact_whatsapp: "text", contact_email: "text", contact_instagram: "text", address: "text", website: "text",
    link: "text", map_link: "text", reg_id: "text", show_contacts: "bool", video_url: "text", pass_mode: "text", official: "bool", spotlight: "bool", best_season: "text", hours: "text", valid_until: "text", deadline: "text", status: "text",
    flags: "int", verified_by_name: "text", verified_at: "text", reject_reason: "text", author_id: "text", author_name: "text",
    author_type: "text", author_member: "bool", pass_enabled: "bool", pass_capacity: "int", price: "int", likes: "int", supports: "int", created_at: "text", updated_at: "text",
  },
  plus_passes: {
    id: "text", code: "text", post_id: "text", user_id: "text", holder_name: "text", status: "text", checked_in_at: "text",
    checked_in_by: "text", reminded: "bool", order_id: "text", created_at: "text",
  },
  plus_organisers: {
    id: "text", account_name: "text", upi: "text", bank_account: "text", ifsc: "text", status: "text", note: "text",
    requested_at: "text", decided_by_name: "text", decided_at: "text", created_at: "text",
  },
  plus_orders: {
    id: "text", rzp_order_id: "text", rzp_payment_id: "text", post_id: "text", user_id: "text", holder_name: "text", amount: "int",
    fee: "int", status: "text", pass_id: "text", refund_id: "text", created_at: "text", paid_at: "text", refunded_at: "text",
  },
  plus_follows: { id: "text", follower_id: "text", followee_id: "text", created_at: "text" },
  plus_supports: { id: "text", post_id: "text", user_id: "text", created_at: "text" },
  plus_notifications: { id: "text", user_id: "text", kind: "text", title: "text", body: "text", url: "text", read: "bool", created_at: "text" },
  plus_payouts: { id: "text", post_id: "text", organiser_id: "text", amount: "int", reference: "text", paid_by_name: "text", paid_at: "text", created_at: "text" },
  plus_likes: { id: "text", post_id: "text", user_id: "text", created_at: "text" },
  plus_saves: { id: "text", post_id: "text", user_id: "text", created_at: "text" },
  plus_push: { id: "text", user_id: "text", endpoint: "text", p256dh: "text", auth: "text", regions: "text", created_at: "text" },
  plus_flags: { id: "text", post_id: "text", user_id: "text", reason: "text", created_at: "text" },
  plus_blocks: { id: "text", blocker_id: "text", blocked_id: "text", created_at: "text" },
  approvals: {
    id: "text", kind: "text", entity: "text", entity_id: "text", title: "text", target: "text", status: "text", requested_by: "text",
    requested_by_name: "text", decided_by_name: "text", note: "text", created_at: "text", decided_at: "text",
  },
  pages: {
    id: "text", slug: "text", title: "text", eyebrow: "text", intro: "text", body: "text", cover: "text", collect: "text",
    status: "text", updated_by: "text", created_at: "text", updated_at: "text",
  },
  translations: {
    id: "text", en: "text", ne: "text", source: "text", page: "text", updated_by: "text", created_at: "text", updated_at: "text",
  },
  featured: {
    id: "text", kind: "text", ref_id: "text", title: "text", text: "text", link: "text", image: "text", pages: "text",
    active: "bool", sort: "int", starts_on: "text", ends_on: "text", created_by_name: "text", created_at: "text", updated_at: "text",
  },
};

const SQL_TYPE: Record<ColType, string> = { text: "TEXT NOT NULL DEFAULT ''", bool: "BOOLEAN NOT NULL DEFAULT false", int: "INTEGER NOT NULL DEFAULT 0" };

export function createTableSQL(): string[] {
  const statements = (Object.keys(SCHEMA) as TableName[]).map((table) => {
    const cols = Object.entries(SCHEMA[table]).map(([name, type]) =>
      name === "id" ? "id TEXT PRIMARY KEY" : name === "last_login" ? "last_login TEXT" : `${name} ${SQL_TYPE[type]}`,
    );
    return `CREATE TABLE IF NOT EXISTS ${table} (${cols.join(", ")})`;
  });
  // Add columns introduced after a table was first created (safe to run every time).
  for (const table of Object.keys(SCHEMA) as TableName[]) {
    const adds = Object.entries(SCHEMA[table])
      .filter(([name]) => name !== "id" && name !== "last_login")
      .map(([name, type]) => `ADD COLUMN IF NOT EXISTS ${name} ${SQL_TYPE[type]}`);
    statements.push(`ALTER TABLE ${table} ${adds.join(", ")}`);
  }
  statements.push(
    "CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (lower(email))",
    "CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_idx ON posts (slug)",
    "CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_idx ON pages (slug)",
    "CREATE INDEX IF NOT EXISTS posts_type_status_idx ON posts (type, status)",
    "CREATE INDEX IF NOT EXISTS members_status_idx ON members (status)",
    // One-time, repeatable: old membership categories → the new list ("Former DSSCOLONY member" becomes the checkbox).
    ...Object.entries(LEGACY_MEMBER_CATEGORIES).map(([from, to]) =>
      `UPDATE members SET category = '${to.category}'${to.formerDsscolony ? ", former_dsscolony = true" : ""} WHERE category = '${from}'`,
    ),
    "CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks (assigned_to)",
    "CREATE INDEX IF NOT EXISTS activity_created_idx ON activity (created_at)",
    "CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id)",
    "CREATE INDEX IF NOT EXISTS finance_status_idx ON finance (status)",
    "CREATE INDEX IF NOT EXISTS videos_status_idx ON videos (status)",
    "CREATE INDEX IF NOT EXISTS poll_voters_poll_idx ON poll_voters (poll_id)",
    "CREATE INDEX IF NOT EXISTS poll_receipts_poll_idx ON poll_receipts (poll_id)",
    "CREATE INDEX IF NOT EXISTS ballots_poll_idx ON ballots (poll_id)",
    "CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS plus_users_email_idx ON plus_users (lower(email))",
    "CREATE INDEX IF NOT EXISTS plus_posts_status_idx ON plus_posts (status)",
    "CREATE INDEX IF NOT EXISTS plus_posts_author_idx ON plus_posts (author_id)",
    "CREATE INDEX IF NOT EXISTS plus_flags_post_idx ON plus_flags (post_id)",
    "CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals (status)",
    "CREATE UNIQUE INDEX IF NOT EXISTS plus_passes_code_idx ON plus_passes (code)",
    "CREATE INDEX IF NOT EXISTS plus_passes_post_idx ON plus_passes (post_id)",
    "CREATE INDEX IF NOT EXISTS plus_passes_user_idx ON plus_passes (user_id)",
    "CREATE INDEX IF NOT EXISTS plus_likes_post_idx ON plus_likes (post_id)",
    "CREATE INDEX IF NOT EXISTS plus_saves_user_idx ON plus_saves (user_id)",
    "CREATE INDEX IF NOT EXISTS plus_push_user_idx ON plus_push (user_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS plus_orders_rzp_idx ON plus_orders (rzp_order_id)",
    "CREATE INDEX IF NOT EXISTS plus_orders_post_idx ON plus_orders (post_id)",
    "CREATE INDEX IF NOT EXISTS plus_payouts_post_idx ON plus_payouts (post_id)",
    "CREATE INDEX IF NOT EXISTS plus_follows_follower_idx ON plus_follows (follower_id)",
    "CREATE INDEX IF NOT EXISTS plus_supports_post_idx ON plus_supports (post_id)",
    "CREATE INDEX IF NOT EXISTS plus_notifications_user_idx ON plus_notifications (user_id)",
    // One vote per member per poll, enforced by the database (the receipt id is poll:user too).
    "CREATE UNIQUE INDEX IF NOT EXISTS poll_receipts_once_idx ON poll_receipts (poll_id, user_id)",
  );
  return statements;
}

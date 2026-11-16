import type { TableName } from "../types";

type ColType = "text" | "bool" | "int";

/** Column registry: used to whitelist columns in generated SQL and to build the DDL. */
export const SCHEMA: Record<TableName, Record<string, ColType>> = {
  users: {
    id: "text", email: "text", name: "text", role: "text", designation: "text", directorate: "text",
    owner: "bool", finance: "text", active: "bool", password_hash: "text", created_at: "text", last_login: "text",
  },
  posts: {
    id: "text", type: "text", title: "text", slug: "text", excerpt: "text", body: "text",
    cover: "text", category: "text", event_date: "text", location: "text", file_url: "text", form_url: "text", directorate: "text",
    status: "text", author_id: "text", author_name: "text", created_at: "text",
    updated_at: "text", published_at: "text",
  },
  members: {
    id: "text", member_no: "text", name: "text", email: "text", phone: "text", area: "text",
    address: "text", occupation: "text", category: "text", interests: "text", status: "text",
    source: "text", notes: "text", added_by: "text", directorate: "text", created_at: "text",
  },
  tasks: {
    id: "text", title: "text", description: "text", assigned_to: "text", assigned_by: "text",
    due_date: "text", priority: "text", status: "text", created_at: "text", updated_at: "text",
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
    "CREATE INDEX IF NOT EXISTS posts_type_status_idx ON posts (type, status)",
    "CREATE INDEX IF NOT EXISTS members_status_idx ON members (status)",
    "CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks (assigned_to)",
    "CREATE INDEX IF NOT EXISTS activity_created_idx ON activity (created_at)",
    "CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id)",
    "CREATE INDEX IF NOT EXISTS finance_status_idx ON finance (status)",
  );
  return statements;
}

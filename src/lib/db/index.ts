import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { TableName, Tables } from "../types";
import { createTableSQL, SCHEMA } from "./schema";
import {
  DEFAULT_DIRECTORATES, DEV_ACCOUNTS, DEV_PASSWORD, OLD_SHARED_HISTORY_TITLE, SHARED_HISTORY_POST, seedMedia, seedPartners, seedPosts, seedTasks, seedUnits,
  type DbShape,
} from "./seed";
import { hashPassword } from "../auth/password";

/**
 * Storage backends:
 *  - Postgres (Neon, via the Vercel integration) when DATABASE_URL is set.
 *  - A local JSON file for development when it is not.
 * Both expose the same small repository API below.
 */

type Row<T extends TableName> = Tables[T];
type Patch<T extends TableName> = Partial<Row<T>>;

interface Backend {
  all<T extends TableName>(table: T): Promise<Row<T>[]>;
  get<T extends TableName>(table: T, id: string): Promise<Row<T> | null>;
  findBy<T extends TableName>(table: T, field: keyof Row<T> & string, value: string): Promise<Row<T>[]>;
  insert<T extends TableName>(table: T, row: Row<T>): Promise<Row<T>>;
  update<T extends TableName>(table: T, id: string, patch: Patch<T>): Promise<Row<T> | null>;
  remove(table: TableName, id: string): Promise<void>;
}

export const usingPostgres = Boolean(process.env.DATABASE_URL);

// ---------------------------------------------------------------- Postgres
function postgresBackend(url: string): Backend {
  const sql = neon(url);
  const cols = (table: TableName) => Object.keys(SCHEMA[table]);
  const pick = (table: TableName, obj: Record<string, unknown>) =>
    Object.entries(obj).filter(([k]) => cols(table).includes(k));

  let ready: Promise<void> | null = null;
  const init = () =>
    (ready ??= (async () => {
      for (const stmt of createTableSQL()) await sql.query(stmt);
      // ---- Structure: the six Directorates become units; names stored earlier become unit ids.
      const [{ dirs }] = (await sql.query("SELECT count(*)::int AS dirs FROM units WHERE kind = 'directorate'")) as { dirs: number }[];
      if (dirs === 0) for (const u of seedUnits()) await rawInsert("units", u);
      for (const d of DEFAULT_DIRECTORATES) {
        for (const t of ["users", "posts", "members", "activity"]) await sql.query(`UPDATE ${t} SET directorate = $1 WHERE directorate = $2`, [d.id, d.name]);
      }
      // ---- Roles from the Master Instruction Chart: Program Director becomes Project Coordinator (L5-1).
      await sql.query("UPDATE users SET role = 'project_coordinator' WHERE role = 'program_director'");
      // ---- Apex ownership: OWNER_EMAIL holds LA Founder-Owner + L1 A President; nobody else is locked.
      const ownerEmail = process.env.OWNER_EMAIL;
      if (ownerEmail) {
        const rows = (await sql.query("SELECT id FROM users WHERE lower(email) = lower($1)", [ownerEmail])) as { id: string }[];
        if (rows.length) {
          await sql.query("UPDATE users SET owner = false WHERE owner = true AND lower(email) <> lower($1)", [ownerEmail]);
          await sql.query("UPDATE users SET owner = true, role = 'super_admin', active = true WHERE lower(email) = lower($1)", [ownerEmail]);
        }
      }
      // ---- Technical accounts (SYS_EMAILS) become SYS Website Administrator, once per email.
      for (const sysEmail of (process.env.SYS_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)) {
        const marker = `migration:sys:${sysEmail}`;
        const done = (await sql.query("SELECT id FROM settings WHERE id = $1", [marker])) as unknown[];
        if (done.length) continue;
        const rows = (await sql.query("SELECT id, owner FROM users WHERE lower(email) = $1", [sysEmail])) as { id: string; owner: boolean }[];
        if (!rows.length || rows[0].owner) continue; // never demote the owner
        await sql.query("UPDATE users SET role = 'sysadmin', finance = '', directorate = '', unit = '', geo = '' WHERE id = $1", [rows[0].id]);
        await rawInsert("settings", { id: marker, value: new Date().toISOString(), updated_by: "system", created_at: new Date().toISOString() });
      }
      // One-time rewording: PAHAD and DSSCOLONY are separate organisations. Skipped if an admin edited the article.
      await sql.query(
        "UPDATE posts SET title = $1, slug = $2, excerpt = $3, body = $4 WHERE id = 'post-seed-1' AND title = $5",
        [SHARED_HISTORY_POST.title, SHARED_HISTORY_POST.slug, SHARED_HISTORY_POST.excerpt, SHARED_HISTORY_POST.body, OLD_SHARED_HISTORY_TITLE],
      );
      const [{ count }] = (await sql.query("SELECT count(*)::int AS count FROM partners")) as { count: number }[];
      if (count === 0) {
        for (const p of seedPartners()) await rawInsert("partners", p);
        for (const m of seedMedia()) await rawInsert("media", m);
        for (const p of seedPosts()) await rawInsert("posts", p);
      }
      const [{ users }] = (await sql.query("SELECT count(*)::int AS users FROM users")) as { users: number }[];
      const email = process.env.SUPERADMIN_EMAIL;
      const password = process.env.SUPERADMIN_PASSWORD;
      if (users === 0 && email && password) {
        await rawInsert("users", {
          id: randomUUID(), email: email.toLowerCase(), name: process.env.SUPERADMIN_NAME ?? "Super Admin",
          role: "super_admin", designation: process.env.SUPERADMIN_TITLE ?? "Founder & President", directorate: "", unit: "", geo: "", owner: true, finance: "", can_submit_videos: false, active: true,
          password_hash: hashPassword(password), created_at: new Date().toISOString(), last_login: null,
        });
      }
    })());

  async function rawInsert(table: TableName, row: Record<string, unknown>) {
    const entries = pick(table, row);
    const names = entries.map(([k]) => k).join(", ");
    const params = entries.map((_, i) => `$${i + 1}`).join(", ");
    const res = await sql.query(`INSERT INTO ${table} (${names}) VALUES (${params}) RETURNING *`, entries.map(([, v]) => v));
    return (res as Record<string, unknown>[])[0];
  }

  return {
    async all(table) {
      await init();
      return (await sql.query(`SELECT * FROM ${table} ORDER BY created_at DESC`)) as never;
    },
    async get(table, id) {
      await init();
      const rows = (await sql.query(`SELECT * FROM ${table} WHERE id = $1`, [id])) as never[];
      return rows[0] ?? null;
    },
    async findBy(table, field, value) {
      await init();
      if (!cols(table).includes(field)) throw new Error(`Unknown column ${field}`);
      return (await sql.query(`SELECT * FROM ${table} WHERE ${field} = $1 ORDER BY created_at DESC`, [value])) as never;
    },
    async insert(table, row) {
      await init();
      return (await rawInsert(table, row as Record<string, unknown>)) as never;
    },
    async update(table, id, patch) {
      await init();
      const entries = pick(table, patch as Record<string, unknown>).filter(([k]) => k !== "id");
      if (entries.length === 0) return this.get(table, id);
      const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(", ");
      const rows = (await sql.query(`UPDATE ${table} SET ${sets} WHERE id = $${entries.length + 1} RETURNING *`, [
        ...entries.map(([, v]) => v),
        id,
      ])) as never[];
      return rows[0] ?? null;
    },
    async remove(table, id) {
      await init();
      await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    },
  };
}

// ---------------------------------------------------------------- Local file
function fileBackend(): Backend {
  const dir = process.env.VERCEL ? "/tmp/pahad" : path.join(process.cwd(), ".data");
  const file = path.join(dir, "pahad-db.json");

  function seed(): DbShape {
    // Demo accounts (with the documented password) exist ONLY on a developer's own machine.
    // On Vercel the only account comes from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD.
    const onServer = Boolean(process.env.VERCEL);
    const users = onServer
      ? process.env.SUPERADMIN_EMAIL && process.env.SUPERADMIN_PASSWORD
        ? [{
            id: randomUUID(), email: process.env.SUPERADMIN_EMAIL.toLowerCase(), name: process.env.SUPERADMIN_NAME ?? "Super Admin",
            role: "super_admin" as const, designation: "Founder & President", directorate: "", unit: "", geo: "", owner: true, finance: "", can_submit_videos: false, active: true,
            password_hash: hashPassword(process.env.SUPERADMIN_PASSWORD), created_at: new Date().toISOString(), last_login: null,
          }]
        : []
      : DEV_ACCOUNTS.map((a) => ({
          id: randomUUID(), ...a, directorate: a.directorate ?? "", unit: "", geo: "", owner: a.owner ?? false, finance: "", can_submit_videos: false, active: true,
          password_hash: hashPassword(DEV_PASSWORD), created_at: new Date().toISOString(), last_login: null,
        }));
    const admin = users.find((u) => u.role === "admin");
    const editor = users.find((u) => u.role === "editor");
    return {
      users, posts: seedPosts(), members: [], tasks: admin && editor ? seedTasks(admin.id, editor.id) : [],
      submissions: [], partners: seedPartners(), media: seedMedia(), team: [], settings: [], activity: [],
      notifications: [], finance: [], finance_requests: [], outbox: [], units: seedUnits(), meetings: [], resolutions: [], circulars: [],
      videos: [], featured: [], polls: [], poll_voters: [], poll_receipts: [], ballots: [],
    };
  }
  function load(): DbShape {
    if (!existsSync(file)) {
      mkdirSync(dir, { recursive: true });
      const data = seed();
      writeFileSync(file, JSON.stringify(data, null, 2));
      return data;
    }
    const data = JSON.parse(readFileSync(file, "utf8")) as DbShape;
    const DEFAULTS = { text: "", bool: false, int: 0 } as const;
    let changed = false;
    for (const t of Object.keys(SCHEMA) as TableName[]) {
      (data[t] as unknown[]) ??= [];
      for (const row of data[t] as Record<string, unknown>[]) {
        for (const [col, type] of Object.entries(SCHEMA[t])) {
          if (row[col] === undefined && col !== "last_login") {
            row[col] = DEFAULTS[type];
            changed = true;
          }
        }
      }
    }
    if (!data.units.some((u) => u.kind === "directorate")) {
      data.units.push(...seedUnits());
      changed = true;
    }
    for (const d of DEFAULT_DIRECTORATES) {
      for (const t of ["users", "posts", "members", "activity"] as const) {
        for (const row of data[t] as { directorate: string }[]) if (row.directorate === d.name) { row.directorate = d.id; changed = true; }
      }
    }
    for (const u of data.users) if ((u.role as string) === "program_director") { u.role = "project_coordinator"; changed = true; }
    // Local demo: make sure every demo role exists (added after the file was first created).
    if (!process.env.VERCEL) {
      for (const a of DEV_ACCOUNTS) {
        if (!data.users.some((u) => u.email === a.email)) {
          changed = true;
          data.users.push({
            id: randomUUID(), ...a, directorate: a.directorate ?? "", unit: "", geo: "", owner: a.owner ?? false, finance: "", can_submit_videos: false, active: true,
            password_hash: hashPassword(DEV_PASSWORD), created_at: new Date().toISOString(), last_login: null,
          });
        } else if (a.owner && !data.users.find((u) => u.email === a.email)!.owner) {
          Object.assign(data.users.find((u) => u.email === a.email)!, { owner: true, designation: a.designation, name: a.name });
          changed = true;
        }
      }
    }
    const old = data.posts.find((p) => p.id === "post-seed-1" && p.title === OLD_SHARED_HISTORY_TITLE);
    if (old) {
      Object.assign(old, SHARED_HISTORY_POST);
      changed = true;
    }
    if (changed) save(data);
    return data;
  }
  function save(data: DbShape) {
    writeFileSync(file, JSON.stringify(data, null, 2));
  }
  const sorted = <T extends { created_at: string }>(rows: T[]) => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    async all(table) {
      return sorted(load()[table] as never[]);
    },
    async get(table, id) {
      return ((load()[table] as { id: string }[]).find((r) => r.id === id) as never) ?? null;
    },
    async findBy(table, field, value) {
      return sorted((load()[table] as never[]).filter((r) => String(r[field]) === value));
    },
    async insert(table, row) {
      const data = load();
      // Same rule as the Postgres primary key: an id can only be inserted once.
      if ((data[table] as { id: string }[]).some((r) => r.id === (row as { id: string }).id)) {
        throw new Error(`duplicate key value violates unique constraint "${table}_pkey"`);
      }
      (data[table] as unknown[]).push(row);
      save(data);
      return row;
    },
    async update(table, id, patch) {
      const data = load();
      const rows = data[table] as { id: string }[];
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...patch, id };
      save(data);
      return rows[i] as never;
    },
    async remove(table, id) {
      const data = load();
      data[table] = (data[table] as { id: string }[]).filter((r) => r.id !== id) as never;
      save(data);
    },
  };
}

export const db: Backend = usingPostgres ? postgresBackend(process.env.DATABASE_URL!) : fileBackend();
export const newId = () => randomUUID();

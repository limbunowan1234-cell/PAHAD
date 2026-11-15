# PAHAD website

The official website and admin panel of **PAHAD: Participatory Action for Holistic Advancement & Development**, an independent, non-partisan, non-profit community development institution working across the Darjeeling and Kalimpong hills, the Terai, the Dooars and the wider Himalayan region.

**Stack:** Next.js 16 (React 19, App Router, Cache Components) · Tailwind CSS 4 · Postgres on Neon (via Vercel) · Cloudflare R2 for uploads · hosted on Vercel · code on GitHub.

Media partner: [Gorkha TV](https://gorkhatv.site) · News partner: [Khabar Darjeeling](https://khabardarjeeling.in)

---

## What's inside

**Public website**: Home, About, Vision & Mission, Values & Principles, Our Story (DSSCOLONY → PAHAD), Governance (organogram), Transparency & Documents, Areas of Work, Programmes, Knowledge & Research, News, Events, Gallery, Partners, Get Involved, Membership application, Contact, Privacy and Terms. Every page works on phones.

**Admin panel** (`/admin`), with three access levels that follow PAHAD’s governance structure:

| | Level 1 · Super Admin<br>Governing Body (e.g. Chairman) | Level 2 · Executive Admin<br>Executive Body (e.g. Chief Executive Director) | Level 3 · General<br>General Assembly members |
|---|:-:|:-:|:-:|
| Upload content (news, events, programmes, resources, documents) | ✓ | ✓ | ✓ (sent for review) |
| Publish / approve content | ✓ | ✓ | |
| Delete content | ✓ | ✓ | |
| Upload gallery photos | ✓ | ✓ | ✓ |
| Add members | ✓ | ✓ | ✓ |
| Edit, approve and export members | ✓ | ✓ | |
| **Delete members** | ✓ | | |
| Assign tasks to the team | ✓ | ✓ | |
| Work on own tasks | ✓ | ✓ | ✓ |
| Read and handle website messages | ✓ | ✓ | |
| Manage partners | ✓ | ✓ | |
| View activity log | ✓ | ✓ | |
| **Create admins and change access levels** | ✓ | | |

The rules live in one file, [`src/lib/permissions.ts`](src/lib/permissions.ts). Every server action checks them; the interface only hides what a person can't use. Every change is recorded in the Activity Log. There must always be at least one active Super Admin.

Website forms (membership, contact, ideas and volunteering) save straight into the admin panel: applicants appear under **Members → Applicants**, and messages appear under **Messages**.

---

## Run it on your computer

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `DATABASE_URL` set, the site uses a local file database (`.data/pahad-db.json`, never committed) with three **local-only demo accounts**, one per level:

| Email | Level |
|---|---|
| `superadmin@pahad.local` | Super Admin (Governing Body) |
| `admin@pahad.local` | Executive Admin (Executive Body) |
| `editor@pahad.local` | General (General Assembly) |

The shared demo password is `DEV_PASSWORD` in [`src/lib/db/seed.ts`](src/lib/db/seed.ts). These accounts are never created on Vercel or when a real database is connected. To start over locally, delete the `.data` folder.

---

## Put it online (GitHub → Vercel → Neon → Cloudflare)

1. **GitHub**: push this repository (already set up as `limbunowan1234-cell/PAHAD`).
2. **Vercel**: *Add New → Project → Import* the GitHub repo. The framework is detected automatically. Every push to `main` then deploys automatically.
3. **Database (Neon)**: in the Vercel project, open *Storage → Create → Neon (Postgres)* and connect it. Vercel adds `DATABASE_URL` for you. Tables are created automatically on first use.
4. **Environment variables**: in *Settings → Environment Variables*, add `AUTH_SECRET`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` and `SUPERADMIN_NAME` (see [`.env.example`](.env.example)). Redeploy, sign in at `/admin`, and change the password under **My Account**. Then create accounts for the rest of the team under **Admin Team**.
5. **Uploads (Cloudflare R2)**: in Cloudflare open *R2 → Create bucket* (e.g. `pahad-media`), turn on public access (an `r2.dev` URL or a custom domain such as `media.yourdomain.org`), then *Manage R2 API Tokens → Create token* with *Object Read & Write* on that bucket. Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_URL` to Vercel and redeploy.
6. **Custom domain (Cloudflare DNS)**: in Vercel go to *Settings → Domains → Add* and enter your domain. In Cloudflare DNS, add the record Vercel shows (a `CNAME` to `cname.vercel-dns.com`), set to **DNS only** (grey cloud) so Vercel can issue the certificate. Then set `NEXT_PUBLIC_SITE_URL` to the new address.

> Without a database, a Vercel deployment can't keep data: its temporary storage resets. Connect Neon before using the admin panel online.

---

## Project map

```
src/app/(site)/          public pages
src/app/admin/           sign-in, admin panel pages and server actions (actions.ts)
src/app/actions/         public form handlers (membership, contact)
src/components/site/     header, footer, cards, forms, gallery
src/components/admin/    admin navigation, forms, content editor
src/lib/content.ts       institutional text (values, work areas, governance…)
src/lib/site.ts          name, contact, social links, navigation
src/lib/permissions.ts   the three access levels
src/lib/db/              Postgres / local file database, schema, seed data
src/lib/auth/            password hashing and signed session cookies
src/lib/storage.ts       Cloudflare R2 / local uploads
```

Brand colours come from the official emblem (Mountain Teal `#164D58`, Sunset Coral `#F99167`, Mountain Cream `#FBD1B8`, Sage `#5B8E89`) and are defined in [`src/app/globals.css`](src/app/globals.css), with contrast checked against WCAG AA.

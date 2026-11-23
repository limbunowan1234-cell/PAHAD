import type { Media, Partner, Post, Task, Tables, TeamMember, Unit, User } from "../types";

const now = () => new Date().toISOString();

/** PAHAD's six Directorates (from the organogram), seeded once as structure units. */
export const DEFAULT_DIRECTORATES: { id: string; name: string }[] = [
  { id: "dir-research", name: "Research, Knowledge and Innovation" },
  { id: "dir-civic", name: "Civic and Community Development" },
  { id: "dir-economic", name: "Economic Development and Enterprise" },
  { id: "dir-media", name: "Media, Communications and Cultural Documentation" },
  { id: "dir-policy", name: "Policy, Governance and Public Affairs" },
  { id: "dir-admin", name: "Administration, Finance and Institutional Development" },
];
export function seedUnits(): Unit[] {
  return DEFAULT_DIRECTORATES.map((d, i) => ({
    id: d.id, kind: "directorate", name: d.name, parent_id: "", active: true, status: "", sort: i + 1, created_at: new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString(),
  }));
}

/** Actual profiles and media supplied in the PAHAD team carousel design. */
export function seedTeamMembers(): Omit<TeamMember, "id" | "created_at">[] {
  return [
    {
      name: "Karma Dorjee", section: "Governing Body", subtitle: "Darjeeling · Governing Body",
      detail: "President & Chairperson · Institutional Governance & Strategic Direction across the Eastern Himalayas.",
      tag: "Governing Body", profile_url: "https://pahad.org/team", profile_label: "PAHAD Profile",
      designation: "", department: "", additional_charge: "",
      photo_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=85", sort: 10,
    },
    {
      name: "Dakshata Gurung", section: "Associates", subtitle: "Darjeeling · Music & Culture",
      detail: "Singer-Songwriter · PAHAD Creative & Cultural Wing celebrating original Himalayan music and youth storytelling.",
      tag: "Artist", profile_url: "https://www.instagram.com/pahadofficial/", profile_label: "Instagram",
      designation: "", department: "", additional_charge: "",
      photo_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85", sort: 20,
    },
    {
      name: "Anjali Rai", section: "Executive Body", subtitle: "Kurseong · Executive Leadership",
      detail: "Chief Executive Director (CED) · Coordinating all six institutional directorates and hill-valley programmes.",
      tag: "Executive · CED", profile_url: "https://www.linkedin.com/in/pahad-org-8a343244a/", profile_label: "LinkedIn",
      designation: "", department: "", additional_charge: "",
      photo_url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=85", sort: 30,
    },
    {
      name: "Tenzing Bhutia", section: "Directorate", subtitle: "Kalimpong · Directorate 01",
      detail: "Documentary Filmmaker & Researcher · Leading visual archives, oral histories, and knowledge documentation.",
      tag: "Creator", profile_url: "https://pahad.org/pages/creators-in-pahad", profile_label: "Creator Profile",
      designation: "", department: "", additional_charge: "",
      photo_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85", sort: 40,
    },
    {
      name: "Bikram Tamang", section: "Directorate", subtitle: "Mirik · Directorate 03",
      detail: "Managing Director · Economic Development, smallholder grower cooperatives, and mountain enterprise.",
      tag: "Directorate Lead", profile_url: "https://pahad.org/our-work#livelihood-development", profile_label: "Portfolio",
      designation: "", department: "", additional_charge: "",
      photo_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=900&q=85", sort: 50,
    },
    {
      name: "Prerna Subba", section: "Secretariat", subtitle: "Kalimpong · Central Secretariat",
      detail: "Executive Secretary · Institutional administration, member records, and transparent governance.",
      tag: "Secretariat", profile_url: "https://www.instagram.com/pahadofficial/", profile_label: "Instagram",
      designation: "", department: "", additional_charge: "",
      photo_url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=85", sort: 60,
    },
    {
      name: "Sonam Lepcha", section: "Geographical Unit", subtitle: "Sikkim · Regional Convenor",
      detail: "Himalayan Sustainability & Heritage · Spring recharge, biodiversity stewardship, and regional fellowships.",
      tag: "Regional Convenor", profile_url: "https://youtube.com/@pahad_org", profile_label: "YouTube",
      designation: "", department: "", additional_charge: "",
      photo_url: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=900&q=85", sort: 70,
    },
    {
      name: "Rohan Chettri", section: "Directorate", subtitle: "Siliguri & Terai · Directorate 05",
      detail: "Managing Director · Policy, Governance & Public Affairs connecting Terai, Dooars, and hill communities.",
      tag: "Directorate Lead", profile_url: "https://pahad.org/team", profile_label: "Profile",
      designation: "", department: "", additional_charge: "",
      photo_url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85", sort: 80,
    },
  ];
}

export function seedPartners(): Partner[] {
  return [
    {
      id: "partner-gorkhatv",
      name: "Gorkha TV",
      role: "Media Partner",
      url: "https://gorkhatv.site",
      logo: "/partners/gorkhatv.png",
      description: "A discovery platform for video and creator channels from the Darjeeling hills, Sikkim and nearby areas.",
      dark_logo: true,
      sort: 1,
      created_at: now(),
    },
    {
      id: "partner-khabar-darjeeling",
      name: "Khabar Darjeeling",
      role: "News Partner",
      url: "https://khabardarjeeling.in",
      logo: "/partners/khabar-darjeeling.jpg",
      description: "Regional news from Darjeeling, the Gorkha community and neighbouring areas of Sikkim and West Bengal.",
      dark_logo: false,
      sort: 2,
      created_at: now(),
    },
  ];
}

const archive: [string, string, string][] = [
  ["/images/first-meet-gdns.jpg", "First-ever meeting at GDNS", "DSSCOLONY archive"],
  ["/images/general-meeting.jpg", "General meeting", "DSSCOLONY archive"],
  ["/images/training-meeting.jpg", "Training meeting", "DSSCOLONY archive"],
  ["/images/meeting-strawberry.jpg", "Meeting at Strawberry", "DSSCOLONY archive"],
  ["/images/busking-old-age-home.jpg", "Busking for an old age home", "Community care"],
  ["/images/cloth-donation.jpg", "Cloth donation drive", "Community care"],
  ["/images/cloth-donation-2.jpg", "Cloth donation drive", "Community care"],
  ["/images/naksha-1.jpg", "NAKSA event", "NAKSA"],
  ["/images/naksha-2.jpg", "NAKSA event", "NAKSA"],
  ["/images/naksha-3.jpg", "NAKSA event", "NAKSA"],
  ["/images/naksha-4.jpg", "NAKSA event", "NAKSA"],
  ["/images/naksha-5.jpg", "NAKSA event", "NAKSA"],
  ["/images/naksha-6.jpg", "NAKSA event", "NAKSA"],
  ["/images/naksha-7.jpg", "NAKSA event", "NAKSA"],
  ["/images/drawing-svda-1.jpg", "Drawing competition at SVDA School", "Youth & creativity"],
  ["/images/drawing-svda-2.jpg", "Drawing competition at SVDA School", "Youth & creativity"],
  ["/images/radio-salesian.jpg", "Interview at Radio Salesian", "Milestones"],
  ["/images/kanchenjunga-gaurav.jpg", "Kanchenjunga Gaurav, Chowrasta", "Milestones"],
];

export function seedMedia(): Media[] {
  return archive.map(([url, caption, album], i) => ({
    id: `media-seed-${i + 1}`,
    url,
    caption,
    album,
    uploaded_by: "PAHAD",
    created_at: new Date(Date.UTC(2026, 10, 1, 0, 0, archive.length - i)).toISOString(),
  }));
}

/** The welcome article. PAHAD and DSSCOLONY are separate organisations with a shared history. */
export const SHARED_HISTORY_POST = {
  title: "PAHAD and DSSCOLONY: a shared history",
  slug: "pahad-and-dsscolony-shared-history",
  excerpt:
    "PAHAD is an independent organisation that builds on the work of DSSCOLONY, a student-led group founded on 24 June 2018. The two share a history but are separate organisations.",
  body: [
    "On 24 June 2018 a group of students came together as DSSCOLONY. With limited resources and no dedicated funding, they found ways to make things happen: meetings, creative events, videos, busking for an old age home and a cloth donation drive.",
    "PAHAD (Participatory Action for Holistic Advancement & Development) is a separate, independent organisation, with its own constitution, governance and membership. It builds on the work, experience and relationships that DSSCOLONY created.",
    "PAHAD's work looks towards education, research, skill development, livelihoods, culture, community institutions, enterprise and opportunities for people to realise their potential.",
    "Everyone who shares PAHAD's purpose is welcome to take part, including people who were part of DSSCOLONY.",
  ].join("\n\n"),
};
/** The original title, used to update existing databases once (only if nobody has edited the article). */
export const OLD_SHARED_HISTORY_TITLE = "From DSSCOLONY to PAHAD: a new chapter";
export const OLD_SHARED_HISTORY_SLUG = "from-dsscolony-to-pahad";

export function seedPosts(): Post[] {
  const t = "2026-11-14T00:00:00.000Z";
  return [
    {
      id: "post-seed-1",
      type: "news",
      visibility: "public", plus_approved: false, audience: "",
      ...SHARED_HISTORY_POST,
      cover: "/images/first-meet-gdns.jpg",
      category: "Announcement",
      event_date: "",
      location: "",
      file_url: "",
      form_url: "",
      directorate: "",
      unit: "",
      status: "published",
      author_id: "",
      author_name: "PAHAD Founding Team",
      created_at: t,
      updated_at: t,
      published_at: t,
    },
  ];
}

/**
 * Local development accounts, one per admin level. These exist only in the
 * local file database (never in production) and are documented in README.md.
 */
export const DEV_ACCOUNTS: { email: string; name: string; role: User["role"]; designation: string; directorate?: string; owner?: boolean }[] = [
  { email: "superadmin@pahad.local", name: "Demo President", role: "super_admin", designation: "Founder & President", owner: true },
  { email: "gs@pahad.local", name: "Demo General Secretary", role: "general_secretary", designation: "General Secretary" },
  { email: "admin@pahad.local", name: "Demo CED", role: "admin", designation: "Chief Executive Director" },
  { email: "treasurer@pahad.local", name: "Demo Treasury", role: "treasurer", designation: "Treasurer" },
  { email: "director@pahad.local", name: "Demo Managing Director", role: "directorate_head", designation: "Managing Director", directorate: "dir-media" },
  { email: "sys@pahad.local", name: "Demo Website Administrator", role: "sysadmin", designation: "Website Administrator" },
  { email: "editor@pahad.local", name: "Demo General Member", role: "editor", designation: "General Assembly member" },
];
export const DEV_PASSWORD = "pahad-dev-2026";

export function seedTasks(adminId: string, editorId: string): Task[] {
  const t = now();
  return [
    {
      id: "task-seed-1",
      title: "Upload the authorised Constitution once approved",
      description: "Add it under Content → Documents with version number and approval date.",
      assigned_to: editorId,
      assigned_by: adminId,
      due_date: "",
      priority: "high",
      status: "todo",
      meeting_id: "",
      created_at: t,
      updated_at: t,
    },
    {
      id: "task-seed-2",
      title: "Add photos from the next community meeting to the Gallery",
      description: "Get permission from people pictured before uploading.",
      assigned_to: editorId,
      assigned_by: adminId,
      due_date: "",
      priority: "normal",
      status: "todo",
      meeting_id: "",
      created_at: t,
      updated_at: t,
    },
  ];
}

export type DbShape = { [K in keyof Tables]: Tables[K][] };

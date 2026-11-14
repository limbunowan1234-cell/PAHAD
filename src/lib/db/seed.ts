import type { Media, Partner, Post, Task, Tables, User } from "../types";

const now = () => new Date().toISOString();

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

export function seedPosts(): Post[] {
  const t = "2026-11-14T00:00:00.000Z";
  return [
    {
      id: "post-seed-1",
      type: "news",
      title: "From DSSCOLONY to PAHAD: a new chapter",
      slug: "from-dsscolony-to-pahad",
      excerpt:
        "What began on 24 June 2018 as a group of students with limited resources is growing into PAHAD, a holistic development institution for the hills.",
      body: [
        "On 24 June 2018 a group of students came together as DSSCOLONY. We had limited resources, no dedicated funding and plenty of challenges, yet we found ways to make things happen: meetings, creative events, videos, busking for an old age home and a cloth donation drive.",
        "Those years taught us that enthusiasm can bring people together, but a lasting institution needs a stronger foundation, responsible leadership and a purpose that can continue beyond any one person.",
        "That is why we are beginning a new chapter through PAHAD: Participatory Action for Holistic Advancement & Development. Our work now looks towards education, research, skill development, livelihoods, culture, community institutions, enterprise and opportunities for people to realise their potential.",
        "PAHAD is not asking anyone to forget DSSCOLONY. It is inviting everyone to be part of what DSSCOLONY helped inspire. If you were once part of the journey, the door is open.",
      ].join("\n\n"),
      cover: "/images/first-meet-gdns.jpg",
      category: "Announcement",
      event_date: "",
      location: "",
      file_url: "",
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
export const DEV_ACCOUNTS: { email: string; name: string; role: User["role"]; designation: string }[] = [
  { email: "superadmin@pahad.local", name: "Demo Super Admin", role: "super_admin", designation: "Website Head" },
  { email: "admin@pahad.local", name: "Demo Admin", role: "admin", designation: "Media & Communications" },
  { email: "editor@pahad.local", name: "Demo Editor", role: "editor", designation: "Volunteer Editor" },
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
      created_at: t,
      updated_at: t,
    },
  ];
}

export type DbShape = { [K in keyof Tables]: Tables[K][] };

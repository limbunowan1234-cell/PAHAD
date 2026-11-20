export const site = {
  name: "PAHAD",
  fullName: "Participatory Action for Holistic Advancement & Development",
  tagline: "People. Knowledge. Action.",
  promise: "Stronger communities, advancing together.",
  description:
    "PAHAD is an independent, non-partisan, non-profit community development institution working with people across the Darjeeling and Kalimpong hills, the Terai, the Dooars and the wider Himalayan region.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pahad.org",
  email: "Pahad.org@gmail.com",
  founded: "24 June 2018",
  region: ["Darjeeling Hills", "Kalimpong Hills", "Terai", "Dooars", "Sikkim & the wider Himalaya"],
  socials: [
    { label: "Facebook", href: "https://www.facebook.com/share/1F25YtgKa4/" },
    { label: "Instagram", href: "https://www.instagram.com/pahadofficial/" },
    { label: "YouTube", href: "https://youtube.com/@pahad_org" },
    { label: "X", href: "https://x.com/PAHAD_official" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/pahad-org-8a343244a/" },
    { label: "WhatsApp", href: "https://whatsapp.com/channel/0029VbDfvyb8qIzxBquSpO0z" },
  ],
  whatsapp: "https://chat.whatsapp.com/CDLvaDxFMhuKmFPTuyGXMB",
  whatsappChannel: "https://whatsapp.com/channel/0029VbDfvyb8qIzxBquSpO0z",
} as const;

export type NavItem = { label: string; href: string; description?: string };
export type NavGroup = { label: string; href: string; items?: NavItem[] };

export const nav: NavGroup[] = [
  {
    label: "About",
    href: "/about",
    items: [
      { label: "About PAHAD", href: "/about", description: "Who we are and why we exist" },
      { label: "Our Team", href: "/team", description: "The people of PAHAD" },
      { label: "Vision & Mission", href: "/vision-mission", description: "The future we work towards" },
      { label: "Values & Principles", href: "/values", description: "How we decide and act" },
      { label: "Our Story", href: "/our-story", description: "Our shared history with DSSCOLONY" },
      { label: "Governance", href: "/governance", description: "Structure and accountability" },
      { label: "Transparency", href: "/transparency", description: "Documents and reporting" },
    ],
  },
  {
    label: "Our Work",
    href: "/our-work",
    items: [
      { label: "Areas of Work", href: "/our-work", description: "Five connected areas, one purpose" },
      { label: "Programmes", href: "/programmes", description: "Turning priorities into practical work" },
      { label: "Knowledge & Research", href: "/knowledge", description: "Local knowledge, shared learning" },
    ],
  },
  {
    label: "Media",
    href: "/news",
    items: [
      { label: "News & Stories", href: "/news", description: "Announcements and updates" },
      { label: "Live Events", href: "/events", description: "What’s on now and coming up" },
      { label: "Gallery", href: "/gallery", description: "Moments from our journey" },
      { label: "Local Films & Documentaries", href: "/films", description: "Films and documentaries from the hills" },
      { label: "PAHAD+ app", href: "/plus", description: "Events, places, local business and briefs from the hills" },
    ],
  },
  { label: "Partners", href: "/partners" },
  {
    label: "Get Involved",
    href: "/get-involved",
    items: [
      { label: "Ways to Get Involved", href: "/get-involved", description: "Volunteer, collaborate, share" },
      { label: "Membership", href: "/membership", description: "Apply to become a member" },
      { label: "Training (members)", href: "/training", description: "Training material for signed-in members" },
      { label: "Contact", href: "/contact", description: "Start a conversation" },
    ],
  },
];

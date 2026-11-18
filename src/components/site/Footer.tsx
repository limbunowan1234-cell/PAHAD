import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { Mail, MessageCircle } from "lucide-react";
import { getFilmsPage } from "@/lib/data";
import { FILMS_PATH } from "@/lib/films";
import { site } from "@/lib/site";
import { SocialIcon } from "./SocialIcon";
import { InstallAppButton } from "./InstallApp";

const columns = (filmsTitle: string) => [
  {
    title: "Organisation",
    links: [
      ["About PAHAD", "/about"],
      ["Our Team", "/team"],
      ["Vision & Mission", "/vision-mission"],
      ["Values & Principles", "/values"],
      ["Our Story", "/our-story"],
      ["Governance", "/governance"],
      ["Transparency", "/transparency"],
      ["Voting results", "/results"],
    ],
  },
  {
    title: "Our Work",
    links: [
      ["Areas of Work", "/our-work"],
      ["Programmes", "/programmes"],
      ["Knowledge & Research", "/knowledge"],
      ["News & Stories", "/news"],
      ["Events", "/events"],
      ["Gallery", "/gallery"],
      [filmsTitle, FILMS_PATH],
    ],
  },
  {
    title: "Take Part",
    links: [
      ["Get Involved", "/get-involved"],
      ["Membership", "/membership"],
      ["Partners", "/partners"],
      ["Contact", "/contact"],
    ],
  },
];

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer() {
  // Cached (settings tag), so the footer stays part of the static page.
  const { title: filmsTitle } = await getFilmsPage();
  return (
    <footer className="mt-auto bg-teal-950 text-white/85">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/images/emblem.png" alt="" width={56} height={56} className="h-14 w-14" />
            <span>
              <span className="block font-display text-2xl font-semibold text-white">PAHAD</span>
              <span className="block text-xs uppercase tracking-[0.14em] text-cream">People · Knowledge · Action</span>
            </span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/75">
            {site.fullName}. An independent, non-partisan, non-profit community development institution rooted in the Darjeeling and Kalimpong hills.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {site.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`PAHAD on ${s.label}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-coral hover:text-ink"
              >
                <SocialIcon name={s.label} />
              </a>
            ))}
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <a href={`mailto:${site.email}`} className="flex items-center gap-2 hover:text-cream">
              <Mail className="h-4 w-4" aria-hidden /> {site.email}
            </a>
            <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-cream">
              <MessageCircle className="h-4 w-4" aria-hidden /> Join the PAHAD WhatsApp community
            </a>
            <a href={site.whatsappChannel} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-cream">
              <SocialIcon name="WhatsApp" className="h-4 w-4" /> Follow the PAHAD WhatsApp channel
            </a>
          </div>
          <InstallAppButton apk="/downloads/PAHAD.apk" className="mt-6 rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-ink hover:bg-peach" />
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          {columns(filmsTitle).map((col) => (
            <div key={col.title}>
              <h2 className="font-sans text-xs font-bold uppercase tracking-[0.16em] text-cream">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-white hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-2">
          <a href="https://gorkhatv.site" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 hover:bg-white/10">
            <Image src="/partners/gorkhatv.png" alt="Gorkha TV" width={160} height={30} className="h-6 w-auto" />
            <span className="text-xs uppercase tracking-[0.14em] text-cream">Media Partner</span>
          </a>
          <a href="https://khabardarjeeling.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 hover:bg-white/10">
            <Image src="/partners/khabar-darjeeling.jpg" alt="Khabar Darjeeling" width={44} height={44} className="h-11 w-11 rounded-full bg-white" />
            <span>
              <span className="block text-sm font-semibold text-white">Khabar Darjeeling</span>
              <span className="text-xs uppercase tracking-[0.14em] text-cream">News Partner</span>
            </span>
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear /> PAHAD. {site.promise}
            <span className="mt-1 block sm:ml-2 sm:mt-0 sm:inline">
              Website designed by{" "}
              <a href="https://adharlimbu.online" target="_blank" rel="noopener" className="underline hover:text-white">
                Darjeeling Web Studio
              </a>
            </span>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/admin" className="hover:text-white">Admin login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { site } from "@/lib/site";

/** Renders schema.org structured data. `<` is escaped so post text can't break out of the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") }}
    />
  );
}

export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : new URL(path, site.url).toString());

/** PAHAD as an organisation, referenced by id from article and event data. */
export const organizationId = `${site.url}/#organization`;

export const organizationJsonLd = {
  "@type": "NGO",
  "@id": organizationId,
  name: site.name,
  alternateName: site.fullName,
  url: site.url,
  logo: absoluteUrl("/images/emblem.png"),
  image: absoluteUrl("/images/hero.jpg"),
  description: site.description,
  slogan: site.tagline,
  email: site.email,
  foundingDate: "2018-06-24",
  nonprofitStatus: "Nonprofit",
  areaServed: site.region.map((name) => ({ "@type": "Place", name })),
  address: { "@type": "PostalAddress", addressLocality: "Darjeeling", addressRegion: "West Bengal", addressCountry: "IN" },
  sameAs: site.socials.filter((s) => s.label !== "WhatsApp").map((s) => s.href),
};

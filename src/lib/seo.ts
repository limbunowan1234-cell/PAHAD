import type { Metadata } from "next";
import { site } from "./site";

/** Share image used when a page has none of its own. */
export const defaultShareImage = { url: "/images/hero.jpg", width: 1960, height: 1103, alt: "Kanchenjunga at sunrise above Darjeeling" };

type PageSeo = {
  title: string;
  description?: string;
  /** Path of this page, e.g. "/about". Used for the canonical URL and og:url. */
  path: string;
  images?: { url: string; alt?: string; width?: number; height?: number }[];
  openGraph?: Metadata["openGraph"];
};

/**
 * Metadata for a public page. A page's `openGraph` and `twitter` replace the root layout's
 * rather than merging with them, so each page gets the full set here, with its own title.
 */
export function pageMetadata({ title, description = site.description, path, images = [defaultShareImage], openGraph }: PageSeo): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: site.name, locale: "en_IN", url: path, title, description, images, ...openGraph },
    twitter: { card: "summary_large_image", site: "@PAHAD_official", title, description, images },
  };
}

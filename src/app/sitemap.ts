import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/data";
import { site } from "@/lib/site";
import type { PostType } from "@/lib/types";
import { POST_TYPE_PATH } from "@/lib/utils";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

/** Public pages. Keep in step with src/app/(site). */
const pages: [path: string, priority: number, changeFrequency: Freq][] = [
  ["/", 1, "weekly"],
  ["/news", 0.9, "daily"],
  ["/events", 0.9, "daily"],
  ["/about", 0.8, "monthly"],
  ["/our-work", 0.8, "monthly"],
  ["/programmes", 0.8, "weekly"],
  ["/knowledge", 0.8, "weekly"],
  ["/membership", 0.8, "monthly"],
  ["/get-involved", 0.7, "monthly"],
  ["/team", 0.7, "monthly"],
  ["/vision-mission", 0.6, "yearly"],
  ["/values", 0.6, "yearly"],
  ["/our-story", 0.6, "yearly"],
  ["/governance", 0.6, "monthly"],
  ["/transparency", 0.6, "monthly"],
  ["/results", 0.5, "monthly"],
  ["/gallery", 0.6, "weekly"],
  ["/partners", 0.6, "monthly"],
  ["/contact", 0.5, "yearly"],
  ["/privacy", 0.2, "yearly"],
  ["/terms", 0.2, "yearly"],
];

/** Post types that have their own detail page. Documents are listed on /transparency only. */
const detailTypes: PostType[] = ["news", "event", "programme", "resource"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => new URL(path, site.url).toString();

  const entries: MetadataRoute.Sitemap = pages.map(([path, priority, changeFrequency]) => ({
    url: url(path),
    changeFrequency,
    priority,
  }));

  let posts: Awaited<ReturnType<typeof getPublishedPosts>> = [];
  try {
    posts = await getPublishedPosts();
  } catch (error) {
    // Still serve the page list if the database is unreachable.
    console.error("sitemap: could not load posts", error);
  }

  for (const post of posts) {
    if (!detailTypes.includes(post.type) || !post.slug) continue;
    const modified = post.updated_at || post.published_at || post.created_at;
    entries.push({
      url: url(`${POST_TYPE_PATH[post.type]}/${post.slug}`),
      lastModified: modified ? new Date(modified) : undefined,
      changeFrequency: "monthly",
      priority: post.type === "news" || post.type === "event" ? 0.7 : 0.6,
      ...(post.cover ? { images: [url(post.cover)] } : {}),
    });
  }

  return entries;
}

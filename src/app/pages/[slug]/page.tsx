import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCustomPage, getPublishedPageSlugs } from "@/lib/data";
import { customPagePath } from "@/lib/menu";
import { pageMetadata } from "@/lib/seo";

/** Custom HTML documents use this route outside the default website layout. */
export async function generateStaticParams() {
  try {
    const slugs = await getPublishedPageSlugs("html");
    if (slugs.length) return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.error("html pages: could not load slugs", error);
  }
  return [{ slug: "_none" }];
}

export async function generateMetadata({ params }: PageProps<"/pages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCustomPage(slug);
  if (!page || page.format !== "html") return { title: "Not found", robots: { index: false } };
  return pageMetadata({ title: page.title, description: page.intro || `${page.title} from PAHAD.`, path: customPagePath(page.slug, "html") });
}

export default function CustomHtmlPageRoute({ params }: PageProps<"/pages/[slug]">) {
  return (
    <Suspense fallback={null}>
      <CustomHtmlDocument params={params} />
    </Suspense>
  );
}

async function CustomHtmlDocument({ params }: { params: PageProps<"/pages/[slug]">["params"] }) {
  const { slug } = await params;
  const page = await getCustomPage(slug);
  if (!page) notFound();
  if (page.format !== "html") redirect(customPagePath(page.slug));

  return (
    <iframe
      title={page.title}
      srcDoc={page.body}
      sandbox="allow-scripts allow-forms"
      referrerPolicy="no-referrer"
      className="fixed inset-0 z-[70] h-dvh w-screen border-0 bg-white"
    />
  );
}

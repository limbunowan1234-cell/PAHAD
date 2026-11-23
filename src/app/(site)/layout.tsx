import { Footer } from "@/components/site/Footer";
import { Suspense } from "react";
import { Header, HeaderView } from "@/components/site/Header";
import { getFilmsPage, getLanguageSwitchOn, getMenu } from "@/lib/data";
import { visibleMenu } from "@/lib/menu";
import { JsonLd, organizationJsonLd } from "@/components/site/JsonLd";
import { site } from "@/lib/site";

/** The menu from Admin → Pages (cached), with the films page under its current name. */
async function SiteHeader() {
  const [{ title }, menu, languages] = await Promise.all([getFilmsPage(), getMenu(), getLanguageSwitchOn()]);
  return <Header menu={visibleMenu(menu, title)} languages={languages} />;
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={{
          "@graph": [
            organizationJsonLd,
            { "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: site.name, publisher: { "@id": organizationJsonLd["@id"] }, inLanguage: "en-IN" },
          ],
        }}
      />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Suspense fallback={<HeaderView pathname="" />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}

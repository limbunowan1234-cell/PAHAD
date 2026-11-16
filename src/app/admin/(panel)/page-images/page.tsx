import Image from "next/image";
import { redirect } from "next/navigation";
import { resetHeroImage, saveHeroImage } from "../../actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { HERO_PAGES, heroSettingId, type HeroKey } from "@/lib/heroes";
import { can } from "@/lib/permissions";

export const metadata = { title: "Page Images" };

export default async function PageImagesPage() {
  const user = await requireUser();
  if (!can(user.role, "site.images")) redirect("/admin");
  const settings = Object.fromEntries((await db.all("settings")).map((s) => [s.id, s]));

  return (
    <>
      <PageHeader
        title="Page Images"
        description="The large banner photo at the top of each page. Changes appear on the website straight away."
      />
      <Notice>
        Wide landscape photos work best (at least 1600 pixels wide). Keep the main subject towards the right: the left side sits behind the heading. A
        Google Drive photo must be shared as “Anyone with the link”.
      </Notice>

      <ul className="grid gap-4 md:grid-cols-2">
        {(Object.keys(HERO_PAGES) as HeroKey[]).map((key) => {
          const page = HERO_PAGES[key];
          const custom = settings[heroSettingId(key)];
          const current = custom?.value || page.fallback;
          return (
            <li key={key} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="relative aspect-[16/6] bg-teal-900">
                {current ? (
                  <Image src={current} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Plain teal banner (no photo)</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{page.label}</p>
                    <a href={page.path} target="_blank" className="text-xs text-teal underline">{page.path}</a>
                  </div>
                  {custom ? <Badge tone="green">Custom · {custom.updated_by}</Badge> : <Badge>Default</Badge>}
                </div>
                <div className="mt-3">
                  <Disclosure summary="Change photo">
                    <AdminForm action={saveHeroImage} submitLabel="Save banner" resetOnSuccess>
                      <input type="hidden" name="page" value={key} />
                      <label className="block">
                        <span className="label">Google Drive link</span>
                        <input name="link" type="url" className="field" placeholder="https://drive.google.com/file/d/…/view" />
                      </label>
                      <label className="block">
                        <span className="label">…or upload a photo (JPG, PNG or WebP, up to 4 MB)</span>
                        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
                      </label>
                    </AdminForm>
                    {custom && (
                      <div className="mt-3">
                        <ActionButton confirm={`Go back to the default ${page.label} banner?`} action={resetHeroImage.bind(null, key)}>
                          Reset to default
                        </ActionButton>
                      </div>
                    )}
                  </Disclosure>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

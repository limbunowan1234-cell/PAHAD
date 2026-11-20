import Image from "next/image";
import { redirect } from "next/navigation";
import { resetHeroImage, saveHeroImage, saveHeroText } from "../../actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { HERO_PAGES, heroSettingId, heroTextId, heroVideoId, parseHeroText, parseHeroVideo, type HeroKey } from "@/lib/heroes";
import { canEditBanners } from "@/lib/permissions";
import { youTubeWatchUrl } from "@/lib/youtube";

export const metadata = { title: "Page Images" };

export default async function PageImagesPage() {
  const user = await requireUser();
  if (!canEditBanners(user) && user.role !== "sysadmin") redirect("/admin");
  const settings = Object.fromEntries((await db.all("settings")).map((s) => [s.id, s]));

  return (
    <>
      <PageHeader
        title="Page Banners"
        description="The banner at the top of each page: its photo or a silent YouTube video, and its small label, title and introduction. Changes appear on the website straight away."
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
          const text = parseHeroText(settings[heroTextId(key)]?.value);
          const video = parseHeroVideo(settings[heroVideoId(key)]?.value);
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
                  <span className="flex flex-wrap gap-1.5">
                    {video?.on && <Badge tone="teal">Video</Badge>}
                    {(text.title || text.intro || text.eyebrow) && <Badge tone="green">Custom title</Badge>}
                    {custom ? <Badge tone="green">Custom photo · {custom.updated_by}</Badge> : <Badge>Default photo</Badge>}
                  </span>
                </div>
                {text.title && <p className="mt-2 font-display text-lg text-teal">“{text.title}”</p>}
                <div className="mt-3 space-y-3">
                  <Disclosure summary="Title, text & video">
                    <AdminForm action={saveHeroText} submitLabel="Save banner">
                      <input type="hidden" name="page" value={key} />
                      <p className="text-xs text-muted">Leave a box empty to keep the page’s own wording.</p>
                      <label className="block">
                        <span className="label">Small label above the title</span>
                        <input name="eyebrow" defaultValue={text.eyebrow} maxLength={60} className="field" />
                      </label>
                      <label className="block">
                        <span className="label">Title</span>
                        <input name="title" defaultValue={text.title} maxLength={140} className="field" />
                      </label>
                      <label className="block">
                        <span className="label">Introduction</span>
                        <textarea name="intro" defaultValue={text.intro} maxLength={400} rows={3} className="field" />
                      </label>
                      <label className="block">
                        <span className="label">YouTube video for the banner (optional)</span>
                        <input name="video" defaultValue={video ? youTubeWatchUrl(video.id) : ""} className="field" placeholder="https://youtu.be/…" />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="video_on" defaultChecked={video?.on} className="h-4 w-4 accent-teal" />
                        Play this video instead of the photo (silent, on a loop)
                      </label>
                    </AdminForm>
                  </Disclosure>
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

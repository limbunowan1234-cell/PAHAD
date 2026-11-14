import Image from "next/image";
import { redirect } from "next/navigation";
import { deleteMedia, uploadMedia } from "../../actions";
import { ActionButton, AdminForm } from "@/components/admin/client";
import { Card, Empty, Field, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export const metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  const user = await requireUser();
  if (!can(user.role, "media.upload")) redirect("/admin");
  const media = await db.all("media");
  const albums = Array.from(new Set(media.map((m) => m.album)));

  return (
    <>
      <PageHeader title="Gallery" description="Photos shown on the public Gallery page. Only upload photos you have permission to share." />
      <Card title="Upload photos" className="mb-8">
        <AdminForm action={uploadMedia} submitLabel="Upload" resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Album" hint="Pick an existing album or type a new one.">
              <input name="album" list="albums" className="field" placeholder="e.g. Community meeting, Nov 2026" />
              <datalist id="albums">{albums.map((a) => <option key={a} value={a} />)}</datalist>
            </Field>
            <Field label="Caption" hint="Applied to every photo in this upload.">
              <input name="caption" className="field" />
            </Field>
            <Field label="Photos" className="sm:col-span-2" hint="JPG, PNG or WebP, up to 4 MB each. Select several at once.">
              <input type="file" name="files" accept="image/jpeg,image/png,image/webp" multiple required className="block w-full text-sm" />
            </Field>
          </div>
        </AdminForm>
      </Card>

      {media.length === 0 ? (
        <Empty>No photos yet.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <figure key={m.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="relative aspect-square bg-sand">
                <Image src={m.url} alt={m.caption} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
              </div>
              <figcaption className="p-3 text-xs">
                <p className="truncate font-medium text-ink">{m.caption}</p>
                <p className="truncate text-muted">{m.album} · {m.uploaded_by}</p>
                {can(user.role, "media.delete") && (
                  <div className="mt-2">
                    <ActionButton variant="danger" confirm="Remove this photo from the gallery?" action={deleteMedia.bind(null, m.id)}>Remove</ActionButton>
                  </div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}

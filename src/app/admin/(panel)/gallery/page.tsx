import Image from "next/image";
import { redirect } from "next/navigation";
import { deleteMedia, uploadMedia } from "../../actions";
import { ActionButton, AdminForm } from "@/components/admin/client";
import { Card, Empty, Field, PageHeader, Notice } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, canView } from "@/lib/permissions";
import { uploadsToDrive } from "@/lib/google";

export const metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  const user = await requireUser();
  if (!canView(user.role, "media.upload")) redirect("/admin");
  const manage = can(user.role, "media.upload");
  const media = await db.all("media");
  const albums = Array.from(new Set(media.map((m) => m.album)));

  return (
    <>
      <PageHeader title="Gallery" description="Photos shown on the public Gallery page. Only upload photos you have permission to share." />
      <p className="mb-4 text-sm text-muted">
        {uploadsToDrive
          ? "Uploaded photos are saved to PAHAD’s Google Drive (pahad.org@gmail.com → PAHAD Website Uploads)."
          : "Uploaded photos are saved to the website’s file storage. Once Google Drive is connected they will be saved there instead."}
      </p>
      {manage ? (
      <Card title="Add photos" className="mb-8">
        <AdminForm action={uploadMedia} submitLabel="Add photos" resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Album" hint="Pick an existing album or type a new one.">
              <input name="album" list="albums" className="field" placeholder="e.g. Community meeting, Nov 2026" />
              <datalist id="albums">{albums.map((a) => <option key={a} value={a} />)}</datalist>
            </Field>
            <Field label="Caption" hint="Applied to every photo in this upload.">
              <input name="caption" className="field" />
            </Field>
            <Field label="Upload photos" className="sm:col-span-2" hint="JPG, PNG or WebP, up to 4 MB each. Select several at once.">
              <input type="file" name="files" accept="image/jpeg,image/png,image/webp" multiple className="block w-full text-sm" />
            </Field>
            <Field label="…or paste Google Drive photo links" className="sm:col-span-2" hint="One link per line. Each photo must be shared as “Anyone with the link”.">
              <textarea name="links" rows={3} className="field" placeholder="https://drive.google.com/file/d/…/view" />
            </Field>
          </div>
        </AdminForm>
      </Card>
      ) : (
        <div className="mb-8"><Notice>View only.</Notice></div>
      )}

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

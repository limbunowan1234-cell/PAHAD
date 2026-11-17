import Image from "next/image";
import Link from "next/link";
import { canSeeCircular } from "@/lib/circulars";
import { getUpcomingEvents } from "@/lib/data";
import { db } from "@/lib/db";
import { loadStructure } from "@/lib/structure";
import type { PublicUser } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge, Card } from "./ui";

/** General Assembly (L6) member portal: membership card, circulars and events. */
export async function MemberPortal({ user }: { user: PublicUser }) {
  const s = await loadStructure();
  const member = (await db.findBy("members", "email", user.email.toLowerCase()))[0];
  const geoPath: string[] = [];
  for (let cur = s.byId.get(member?.geo || user.geo); cur; cur = cur.parent_id ? s.byId.get(cur.parent_id) : undefined) geoPath.unshift(cur.name);
  const circulars = (await db.all("circulars")).filter((c) => canSeeCircular(s, user, member?.geo ?? "", c)).slice(0, 4);
  const { upcoming } = await getUpcomingEvents(3);

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <section aria-label="Membership card" className="relative overflow-hidden rounded-2xl bg-teal p-6 text-white">
        <div className="flex items-center gap-3">
          <Image src="/images/emblem.png" alt="" width={44} height={44} />
          <div>
            <p className="font-display text-lg">PAHAD</p>
            <p className="text-xs uppercase tracking-[0.14em] text-cream">General Assembly member</p>
          </div>
        </div>
        <p className="mt-6 font-display text-2xl">{member?.name ?? user.name}</p>
        <p className="mt-1 font-mono text-cream">{member?.member_no || "Member number pending"}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-white/60">Status</dt><dd>{member ? (member.status === "active" ? "Active" : member.status) : "Not linked"}</dd></div>
          <div><dt className="text-white/60">Since</dt><dd>{member ? formatDate(member.created_at, { month: "short", year: "numeric" }) : "—"}</dd></div>
          <div className="col-span-2"><dt className="text-white/60">GP / Ward</dt><dd>{geoPath.join(" › ") || "Not tagged yet"}</dd></div>
          {(member?.unit || member?.directorate) && (
            <div className="col-span-2"><dt className="text-white/60">Directorate / unit</dt><dd>{s.byId.get(member.unit || member.directorate)?.name}</dd></div>
          )}
        </dl>
        {!member && (
          <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm">
            Your account isn’t linked to a membership record yet. The General Secretary links accounts by email.
          </p>
        )}
      </section>

      <div className="space-y-6">
        <Card title="Latest circulars">
          {circulars.length === 0 ? (
            <p className="text-sm text-muted">No circulars yet.</p>
          ) : (
            <ul className="space-y-3">
              {circulars.map((c) => (
                <li key={c.id}>
                  <Link href="/admin/circulars" className="block hover:underline">
                    <span className="font-mono text-xs text-teal">{c.number}</span> <span className="font-medium text-ink">{c.title}</span>
                  </Link>
                  <p className="text-xs text-muted">{formatDate(c.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Training material">
          <p className="text-sm text-muted">Guides and learning material for members.</p>
          <a href="/training" target="_blank" className="mt-2 inline-block text-sm font-semibold text-teal hover:underline">Open the Training page</a>
        </Card>
        <Card title="Upcoming events">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">No events announced yet.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <a href={`/events/${e.slug}`} target="_blank" className="font-medium text-teal hover:underline">{e.title}</a>
                  <Badge>{formatDate(e.event_date, { day: "numeric", month: "short" })}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

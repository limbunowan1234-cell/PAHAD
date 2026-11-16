import Image from "next/image";
import type { TeamMember } from "@/lib/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function TeamCard({ person }: { person: TeamMember }) {
  return (
    <article className="flex flex-col items-center rounded-[var(--radius-card)] border border-line bg-white p-6 text-center">
      <div className="relative h-28 w-28 overflow-hidden rounded-full bg-cream ring-4 ring-sand">
        {person.photo_url ? (
          <Image src={person.photo_url} alt={`Photo of ${person.name}`} fill sizes="112px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-3xl text-teal" aria-hidden>
            {initials(person.name)}
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display text-xl text-teal">{person.name}</h3>
      {person.designation && <p className="mt-1 font-semibold text-coral-700">{person.designation}</p>}
      <dl className="mt-3 space-y-1 text-sm text-muted">
        {person.department && (
          <div>
            <dt className="sr-only">Department</dt>
            <dd>{person.department}</dd>
          </div>
        )}
        {person.additional_charge && (
          <div>
            <dt className="inline font-medium text-ink">Additional charge: </dt>
            <dd className="inline">{person.additional_charge}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

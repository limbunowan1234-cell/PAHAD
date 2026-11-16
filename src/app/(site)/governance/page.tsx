import type { Metadata } from "next";
import { governance } from "@/lib/content";
import { CtaBand, PageHero, SectionHeading, TextLink } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Governance",
  description: "PAHAD's governance framework: General Assembly, Governing Body, Chief Executive Director, Central Secretariat and six Directorates.",
};

function Tier({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div className="relative rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
      <p className="eyebrow">{step}</p>
      <h3 className="mt-2 text-2xl font-medium text-teal">{title}</h3>
      <div className="mt-4 text-muted">{children}</div>
    </div>
  );
}

const Connector = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-sage">
    <span className="h-6 w-0.5 bg-sage" />
    <span className="my-1">{label}</span>
    <span className="h-6 w-0.5 bg-sage" />
  </div>
);

export default function GovernancePage() {
  return (
    <>
      <PageHero
        eyebrow="Governance"
        title="Responsible, transparent and participatory."
        intro="PAHAD's governance framework provides clear oversight, defined responsibilities and accountable administration as the institution develops."
        page="governance"
      />

      <section className="container-page py-20 lg:py-24">
        <SectionHeading eyebrow="Organisational structure" title="How PAHAD is organised" intro="Democratic governance and oversight, with executive administration and implementation accountable to it." />

        <div className="mx-auto mt-12 max-w-4xl">
          <Tier step="01 · Democratic authority" title="General Assembly">
            <p>{governance.generalAssembly}</p>
          </Tier>
          <Connector label="Elects · holds accountable" />
          <Tier step="02 · Governance & oversight" title="Governing Body">
            <p>Seven elected positions with collective authority for institutional governance, oversight and strategic direction.</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {governance.governingBody.map((r) => (
                <li key={r} className="rounded-full bg-sand px-3 py-1.5 text-sm font-medium text-teal">{r}</li>
              ))}
            </ul>
          </Tier>
          <Connector label="Appoints · oversees" />
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <Tier step="03 · Executive leadership" title="Chief Executive Director">
              <p>{governance.ced}</p>
            </Tier>
            <Tier step="Executive support" title="Central Secretariat">
              <ul className="space-y-1.5 text-sm">
                {governance.secretariat.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </Tier>
          </div>
          <Connector label="Coordinates" />
          <div className="rounded-[var(--radius-card)] bg-teal p-6 text-white sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cream">04 · Implementation</p>
            <h3 className="mt-2 text-2xl font-medium">Six Directorates</h3>
            <p className="mt-2 text-white/80">Each led by a Managing Director.</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {governance.directorates.map((d, i) => (
                <li key={d} className="rounded-2xl bg-white/10 p-4 text-sm font-medium">
                  <span className="block text-xs text-coral">D{i + 1}</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 rounded-2xl bg-sand p-5 text-sm text-muted">{governance.memberUnit}</p>
        </div>
      </section>

      <section className="bg-sand py-20">
        <div className="container-page grid gap-6 md:grid-cols-2">
          <div className="rounded-[var(--radius-card)] bg-white p-8 ring-1 ring-line">
            <h2 className="text-2xl font-medium text-teal">Progressive development</h2>
            <p className="mt-3 leading-relaxed text-muted">
              The departments proposed under each directorate are an organisational design to be activated progressively. They do not imply that every
              role or department is currently staffed.
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-white p-8 ring-1 ring-line">
            <h2 className="text-2xl font-medium text-teal">Accountability</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Decisions, records, finances and programme activities are documented and reviewed in accordance with adopted rules and policies.
            </p>
            <TextLink href="/transparency" className="mt-5">Documents & transparency</TextLink>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

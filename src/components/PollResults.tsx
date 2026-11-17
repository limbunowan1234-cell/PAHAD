import { pct, type Tally } from "@/lib/polls";

/**
 * Results as a table with a horizontal bar per option (one series, one hue, labelled
 * directly), so the numbers stay readable without the chart.
 */
export function PollResults({ t, final, showParticipation = true }: { t: Tally; final: boolean; showParticipation?: boolean }) {
  const max = Math.max(1, ...t.options.map((o) => o.votes));
  return (
    <div>
      {showParticipation && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Eligible voters", String(t.eligible)],
            ["Votes cast", String(t.cast)],
            ["Not voted", String(t.eligible - t.cast)],
            ["Turnout", pct(t.turnout)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-white p-4">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-display text-3xl text-teal">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {final && t.winners.length > 0 && (
        <p className="mt-4 rounded-xl bg-sage-100 p-3 text-sm text-teal">
          {t.winners.length === 1 ? <>Most votes: <strong>{t.winners[0]}</strong></> : <>Tie for most votes: <strong>{t.winners.join(", ")}</strong></>}
        </p>
      )}
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Votes for each option{final ? " (final)" : " (live)"}</caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th scope="col" className="w-1/3 py-2 pr-3 font-medium">Candidate / option</th>
            <th scope="col" className="py-2 font-medium">Votes</th>
            <th scope="col" className="w-16 py-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {t.options.map((o) => (
            <tr key={o.id}>
              <th scope="row" className="py-3 pr-3 text-left font-medium text-ink">{o.label}</th>
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-line/70" aria-hidden>
                    <div className="h-3 rounded-full bg-teal" style={{ width: `${(o.votes / max) * 100}%`, minWidth: o.votes ? 6 : 0 }} title={`${o.label}: ${o.votes} votes (${pct(o.share)})`} />
                  </div>
                  <span className="w-10 text-right tabular-nums text-ink">{o.votes}</span>
                </div>
              </td>
              <td className="py-3 text-right tabular-nums text-muted">{pct(o.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { redirect } from "next/navigation";
import { decideOrganiser, recordPayout, refundAllForEvent, refundPlusOrder, setPlusFee } from "../../../plus-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { PlusTabs } from "@/components/admin/PlusTabs";
import { Badge, Card, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, canView } from "@/lib/permissions";
import { eventMoney, getFeePercent } from "@/lib/plus/payments";
import { isLivePlus } from "@/lib/plus/posts";
import { paymentsConfigured, rupees } from "@/lib/plus/razorpay";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "PAHAD+ payments" };

/** Paid E-Passes: PAHAD collects through Razorpay, keeps its fee and pays organisers out after the event. */
export default async function PlusPaymentsPage() {
  const user = await requireUser();
  if (!canView(user.role, "plus.payments")) redirect("/admin");
  const manage = can(user.role, "plus.payments");
  const [fee, organisers, users, posts, orders] = await Promise.all([getFeePercent(), db.all("plus_organisers"), db.all("plus_users"), db.all("plus_posts"), db.all("plus_orders")]);
  const name = new Map(users.map((u) => [u.id, u]));
  const pending = organisers.filter((o) => o.status === "pending");
  const approved = organisers.filter((o) => o.status === "approved");
  const events = posts.filter((p) => p.price > 0).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const money = await Promise.all(events.map(async (p) => ({ post: p, m: await eventMoney(p.id), orders: orders.filter((o) => o.post_id === p.id && o.status !== "created") })));
  const totals = money.reduce((t, { m }) => ({ gross: t.gross + m.gross, fee: t.fee + m.fee, owed: t.owed + m.owed }), { gross: 0, fee: 0, owed: 0 });

  return (
    <>
      <PageHeader title="PAHAD+" description="Paid E-Passes: buyers pay PAHAD through Razorpay. PAHAD keeps its fee and pays each organiser after the event, by bank transfer or UPI outside the app; record each payout here." />
      <PlusTabs user={user} active="payments" />
      {!paymentsConfigured && <Notice tone="warn">Payments are switched off: add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in Vercel. Until then nobody can add a price or buy.</Notice>}
      {!manage && <Notice>View only. Payments are managed by the President.</Notice>}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card title="Sold"><p className="text-2xl font-semibold">{rupees(totals.gross)}</p></Card>
        <Card title="PAHAD fees"><p className="text-2xl font-semibold">{rupees(totals.fee)}</p></Card>
        <Card title="Owed to organisers"><p className="text-2xl font-semibold text-teal">{rupees(totals.owed)}</p></Card>
      </div>

      <Card title="PAHAD's fee">
        {manage ? (
          <AdminForm action={setPlusFee} submitLabel="Save fee">
            <Field label="Fee on each paid E-Pass (%)" hint="0 to 50. Applies to new sales; each sale keeps the fee it was sold with. Razorpay's own charges come out of PAHAD's share.">
              <input name="fee" type="number" min={0} max={50} step="0.5" defaultValue={fee} className="field max-w-[10rem]" />
            </Field>
          </AdminForm>
        ) : <p className="text-sm">{fee}%</p>}
      </Card>

      <h2 className="mt-10 font-display text-2xl text-teal">Requests to sell {pending.length > 0 && <Badge tone="amber">{pending.length}</Badge>}</h2>
      {pending.length === 0 ? <Empty>No requests waiting.</Empty> : (
        <ul className="mt-4 space-y-3">
          {pending.map((o) => (
            <li key={o.id} className="rounded-2xl border border-amber-200 bg-white p-4 text-sm">
              <p className="font-semibold text-ink">{name.get(o.id)?.name ?? "Deleted account"} <span className="font-normal text-muted">({name.get(o.id)?.email})</span></p>
              <p className="text-muted">Payout to: {o.account_name}{o.upi && ` · UPI ${o.upi}`}{o.bank_account && ` · A/c ${o.bank_account} · ${o.ifsc}`}</p>
              <p className="text-xs text-muted">Asked {formatDate(o.requested_at)}</p>
              {manage && (
                <div className="mt-3"><AdminForm action={decideOrganiser} submitLabel="Save decision">
                  <input type="hidden" name="id" value={o.id} />
                  <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                    <Field label="Decision"><select name="decision" defaultValue="approved" className="field"><option value="approved">Approve</option><option value="rejected">Reject</option></select></Field>
                    <Field label="Note to the organiser (optional)"><input name="note" maxLength={300} className="field" /></Field>
                  </div>
                </AdminForm></div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-display text-2xl text-teal">Approved organisers ({approved.length})</h2>
      {approved.length === 0 ? <Empty>None yet.</Empty> : (
        <ul className="mt-4 space-y-2">
          {approved.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 text-sm">
              <div>
                <p className="font-semibold text-ink">{name.get(o.id)?.name ?? "Deleted account"}</p>
                <p className="text-muted">{o.account_name}{o.upi && ` · UPI ${o.upi}`}{o.bank_account && ` · A/c ${o.bank_account} · ${o.ifsc}`} · approved by {o.decided_by_name}</p>
              </div>
              {manage && (
                <AdminForm action={decideOrganiser} submitLabel="Revoke">
                  <input type="hidden" name="id" value={o.id} /><input type="hidden" name="decision" value="revoked" />
                </AdminForm>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-display text-2xl text-teal">Paid events</h2>
      {money.length === 0 ? <Empty>No paid events yet.</Empty> : (
        <ul className="mt-4 space-y-4">
          {money.map(({ post, m, orders: sold }) => {
            const ended = !isLivePlus(post);
            return (
              <li key={post.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{post.title}</p>
                  <Badge>{rupees(post.price)} each</Badge>
                  <Badge tone={ended ? "grey" : "green"}>{ended ? "Ended" : "On"}</Badge>
                </div>
                <p className="text-muted">By {post.author_name} · {post.starts_at.replace("T", " ")} · <a href={`/plus/checkin/${post.id}`} target="_blank" className="text-teal underline">check-in</a></p>
                <p className="mt-1">
                  {m.sold} sold · {rupees(m.gross)} · fee {rupees(m.fee)} · paid out {rupees(m.paidOut)} · <strong>owed {rupees(m.owed)}</strong>
                  {m.refunds > 0 && ` · ${m.refunds} refunded (${rupees(m.refundedAmount)})`}
                </p>
                {m.payouts.length > 0 && <p className="text-xs text-muted">Payouts: {m.payouts.map((p) => `${rupees(p.amount)} on ${formatDate(p.paid_at)} (${p.reference})`).join("; ")}</p>}
                {manage && (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {m.owed > 0 && (
                      <Disclosure summary={ended ? "Record a payout" : "Record a payout (event not over yet)"}>
                        <AdminForm action={recordPayout} submitLabel="Record payout">
                          <input type="hidden" name="post_id" value={post.id} />
                          <Field label="Amount paid (₹)"><input name="amount" type="number" step="0.01" min={1} defaultValue={(m.owed / 100).toFixed(2)} className="field" /></Field>
                          <Field label="UPI / bank reference *"><input name="reference" required maxLength={120} className="field" /></Field>
                        </AdminForm>
                      </Disclosure>
                    )}
                    {sold.length > 0 && (
                      <Disclosure summary={`Orders (${sold.length})`}>
                        <ul className="divide-y divide-line">
                          {sold.map((o) => (
                            <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                              <span>{o.holder_name} · {rupees(o.amount)} · {o.status === "refunded" ? `refunded ${formatDate(o.refunded_at)}` : formatDate(o.paid_at)}</span>
                              {o.status === "paid" && <ActionButton variant="danger" confirm={`Refund ${rupees(o.amount)} to ${o.holder_name}? Their E-Pass is cancelled.`} action={refundPlusOrder.bind(null, o.id)}>Refund</ActionButton>}
                            </li>
                          ))}
                        </ul>
                        {sold.some((o) => o.status === "paid") && (
                          <div className="mt-2"><ActionButton variant="danger" confirm={`Refund every paid E-Pass for “${post.title}”?`} action={refundAllForEvent.bind(null, post.id)}>Refund all (event cancelled)</ActionButton></div>
                        )}
                      </Disclosure>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

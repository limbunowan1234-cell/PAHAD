import { db } from "@/lib/db";
import { pushToUser } from "@/lib/plus/push";

/**
 * Daily E-Pass reminders (Vercel Cron, see vercel.json): tells pass holders about events starting in the next 36 hours.
 * Vercel sends "Authorization: Bearer <CRON_SECRET>"; without CRON_SECRET set, the job does nothing.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not set.", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const nowMs = Date.now();
  const soon = nowMs + 36 * 3_600_000;
  const passes = (await db.all("plus_passes")).filter((p) => p.status === "active" && !p.reminded);
  let reminded = 0;
  for (const pass of passes) {
    const post = await db.get("plus_posts", pass.post_id);
    if (!post || !["verified", "flag_proof"].includes(post.status) || !post.starts_at) continue;
    const starts = Date.parse(`${post.starts_at}:00+05:30`);
    if (!(starts > nowMs && starts <= soon)) continue;
    await db.update("plus_passes", pass.id, { reminded: true });
    const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(starts);
    await pushToUser(pass.user_id, { title: `Reminder: ${post.title}`, body: `${when}. Your E-Pass is in PAHAD+ → Me.`, url: `/plus/pass/${pass.code}`, tag: `pass-${pass.id}` });
    reminded++;
  }
  return Response.json({ reminded });
}

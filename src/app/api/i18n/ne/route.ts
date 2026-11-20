import { getNepaliDictionary } from "@/lib/data";

/** The Nepali dictionary, loaded by the browser only when a visitor switches to नेपाली. */
export async function GET() {
  const dict = await getNepaliDictionary();
  return Response.json(dict, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}

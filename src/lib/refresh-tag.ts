import { revalidateTag, updateTag } from "next/cache";

/**
 * Refresh cached data for a tag from anywhere on the server. Server Actions use updateTag (the page re-renders with
 * fresh data straight away); Route Handlers, such as the PAHAD+ phone app's API, can't call updateTag, so they fall
 * back to revalidateTag with no stale window.
 */
export function refreshTag(tag: string) {
  try {
    updateTag(tag);
  } catch {
    revalidateTag(tag, { expire: 0 });
  }
}

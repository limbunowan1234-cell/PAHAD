import { ArrowUpRight } from "lucide-react";
import { youTubeWatchUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

/** Second way to watch: open the video on YouTube in a new tab. */
export function WatchOnYouTube({ id, title, className }: { id: string; title: string; className?: string }) {
  return (
    <a
      href={youTubeWatchUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Watch “${title}” on YouTube (opens in a new tab)`}
      className={cn("mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline", className)}
    >
      Watch on YouTube <ArrowUpRight className="h-4 w-4" aria-hidden />
    </a>
  );
}

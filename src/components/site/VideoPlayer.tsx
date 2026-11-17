"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";
import { youTubeEmbedUrl, youTubeThumb } from "@/lib/youtube";

/**
 * Shows the YouTube thumbnail and loads the player only when pressed: pages stay fast,
 * and YouTube sets no cookies until the visitor chooses to watch.
 */
export function VideoPlayer({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-teal-950">
      {playing ? (
        <iframe
          src={youTubeEmbedUrl(id)}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play video: ${title}`}>
          <Image src={youTubeThumb(id)} alt="" fill sizes="(min-width:1024px) 600px, 100vw" className="object-cover opacity-90 transition-opacity group-hover:opacity-100" />
          <span className="absolute inset-0 bg-gradient-to-t from-teal-950/60 to-transparent" />
          <span className="absolute left-1/2 top-1/2 inline-flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-coral text-ink shadow-lg transition-transform group-hover:scale-110">
            <Play className="ml-1 h-7 w-7 fill-current" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}

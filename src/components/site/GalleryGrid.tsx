"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Media } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GalleryGrid({ items }: { items: Media[] }) {
  const albums = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.album).filter(Boolean)))], [items]);
  const [album, setAlbum] = useState("All");
  const [index, setIndex] = useState<number | null>(null);
  const shown = album === "All" ? items : items.filter((i) => i.album === album);

  const step = useCallback(
    (d: number) => setIndex((i) => (i === null ? null : (i + d + shown.length) % shown.length)),
    [shown.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Albums">
        {albums.map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={album === a}
            onClick={() => setAlbum(a)}
            className={cn("rounded-full px-4 py-2 text-sm font-medium", album === a ? "bg-teal text-white" : "bg-sand text-teal hover:bg-cream")}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((m, i) => (
          <button key={m.id} onClick={() => setIndex(i)} className="group relative mb-4 block w-full overflow-hidden rounded-2xl break-inside-avoid">
            <Image src={m.url} alt={m.caption} width={800} height={600} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="h-auto w-full transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-teal-950/85 to-transparent p-4 pt-10 text-left text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {m.caption}
            </span>
          </button>
        ))}
      </div>

      {index !== null && shown[index] && (
        <div role="dialog" aria-modal="true" aria-label={shown[index].caption} className="fixed inset-0 z-[70] flex items-center justify-center bg-teal-950/95 p-4" onClick={() => setIndex(null)}>
          <button aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={() => setIndex(null)}>
            <X className="h-6 w-6" />
          </button>
          <button aria-label="Previous photo" className="absolute left-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-6" onClick={(e) => { e.stopPropagation(); step(-1); }}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image src={shown[index].url} alt={shown[index].caption} width={1600} height={1000} className="max-h-[80vh] w-auto rounded-xl object-contain" />
            <figcaption className="mt-3 text-center text-white">
              {shown[index].caption} <span className="text-white/60">· {shown[index].album}</span>
            </figcaption>
          </figure>
          <button aria-label="Next photo" className="absolute right-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-6" onClick={(e) => { e.stopPropagation(); step(1); }}>
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}

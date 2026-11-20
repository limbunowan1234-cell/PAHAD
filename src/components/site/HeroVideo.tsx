/**
 * A muted, looping YouTube video filling a banner, behind the heading. The banner photo stays
 * underneath as a backdrop while the video loads, and for visitors who prefer reduced motion.
 */
export function HeroVideo({ id }: { id: string }) {
  const params = new URLSearchParams({
    autoplay: "1", mute: "1", loop: "1", playlist: id, controls: "0", playsinline: "1", rel: "0", modestbranding: "1", disablekb: "1", iv_load_policy: "3",
  });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden motion-reduce:hidden">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        title="Background video"
        tabIndex={-1}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
      />
    </div>
  );
}

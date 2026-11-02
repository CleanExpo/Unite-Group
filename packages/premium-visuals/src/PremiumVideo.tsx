'use client';
import { useEffect, useRef, useState } from 'react';
import type { MediaEntry } from './manifest';

export interface PremiumVideoProps {
  /** Manifest entry for the video; `poster` required. Provide sources in priority order. */
  media: MediaEntry;
  sources: { src: string; type: 'video/mp4; codecs=av01.0.05M.08' | 'video/webm' | 'video/mp4' | string }[];
  className?: string;
  /** Hero video: poster eager, video starts immediately when visible. */
  hero?: boolean;
}

/**
 * Muted autoplay loop with poster, lazy-loaded via IntersectionObserver.
 * Honours prefers-reduced-motion (shows poster only) and Save-Data.
 * Encode with: AV1 MP4 + VP9 WebM + H.264 MP4 fallback (see bin/blender-render.mjs --encode).
 */
export function PremiumVideo({ media, sources, className, hero }: PremiumVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saveData) { setStill(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setLoad(true); el.play().catch(() => {}); } else el.pause();
    }, { rootMargin: hero ? '0px' : '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hero]);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`} data-pv-source={media.source} data-pv-video>
      {still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.poster} alt={media.alt} className="h-full w-full object-cover" loading={hero ? 'eager' : 'lazy'} />
      ) : (
        <video ref={ref} className="h-full w-full object-cover" muted loop playsInline preload={hero ? 'metadata' : 'none'}
          poster={media.poster} aria-label={media.alt}>
          {load && sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
        </video>
      )}
    </div>
  );
}

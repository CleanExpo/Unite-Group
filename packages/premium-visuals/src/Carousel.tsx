'use client';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Premium Embla carousel: drag/swipe, keyboard, snap, real-icon controls, a11y labels. */
export function Carousel({ slides, label, className }: { slides: ReactNode[]; label: string; className?: string }) {
  const [ref, api] = useEmblaCarousel({ loop: true, align: 'start', skipSnaps: false });
  const [index, setIndex] = useState(0);
  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  useEffect(() => { if (!api) return; const on = () => setIndex(api.selectedScrollSnap()); api.on('select', on); on(); }, [api]);
  return (
    <div data-pv-carousel className={`relative ${className ?? ''}`} role="region" aria-roledescription="carousel" aria-label={label}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); }} tabIndex={0}>
      <div className="overflow-hidden" ref={ref}>
        <div className="flex gap-6">
          {slides.map((s, i) => (
            <div key={i} className="min-w-0 shrink-0 grow-0 basis-[85%] md:basis-[45%] lg:basis-[32%]" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>{s}</div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={prev} aria-label="Previous" className="p-2 transition-colors hover:opacity-80"><ChevronLeft size={20} /></button>
        <button type="button" onClick={next} aria-label="Next" className="p-2 transition-colors hover:opacity-80"><ChevronRight size={20} /></button>
        <span className="text-[12px] tabular-nums opacity-70">{index + 1} / {slides.length}</span>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import type { MediaEntry } from './manifest';
import { PremiumImage } from './PremiumImage';
import { PremiumVideo } from './PremiumVideo';
import { MotionSection, MotionItem } from './MotionSection';
import { type } from './fonts';

/**
 * Required hero for marketing pages: real/generated video (preferred) or photo, with scrim + premium type.
 * With `video`, `media` must be the video's manifest entry (kind "video"), whose `poster` is shown.
 */
export function PremiumHero({ eyebrow, title, lede, actions, media, video }: {
  eyebrow?: string; title: ReactNode; lede?: ReactNode; actions?: ReactNode;
  media: MediaEntry; video?: { src: string; type: string }[];
}) {
  return (
    <header data-pv-hero className="relative isolate min-h-[88svh] overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {video?.length ? <PremiumVideo hero media={media} sources={video} className="h-full w-full" />
          : <PremiumImage hero media={media} scrim="none" className="h-full w-full" />}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      </div>
      <MotionSection effect="stagger" as="div" className="mx-auto flex min-h-[88svh] max-w-7xl flex-col justify-end px-6 pb-20 text-white">
        {eyebrow && <MotionItem><p className={type.eyebrow}>{eyebrow}</p></MotionItem>}
        <MotionItem><h1 className={`${type.display} mt-4 max-w-4xl text-[clamp(2.75rem,7vw,6rem)]`}>{title}</h1></MotionItem>
        {lede && <MotionItem><p className={`${type.body} mt-6 max-w-2xl text-white/85`}>{lede}</p></MotionItem>}
        {actions && <MotionItem><div className="mt-10 flex flex-wrap gap-4">{actions}</div></MotionItem>}
      </MotionSection>
    </header>
  );
}

/** Split section: media one side, copy the other. */
export function MediaSection({ media, video, reverse, eyebrow, title, children }: {
  media: MediaEntry; video?: { src: string; type: string }[]; reverse?: boolean; eyebrow?: string; title: ReactNode; children: ReactNode;
}) {
  return (
    <MotionSection className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
      <div className={`aspect-[4/5] ${reverse ? 'lg:order-2' : ''}`}>
        {video?.length ? <PremiumVideo media={media} sources={video} className="h-full w-full" />
          : <PremiumImage media={media} className="h-full w-full" />}
      </div>
      <div>
        {eyebrow && <p className={type.eyebrow}>{eyebrow}</p>}
        <h2 className={`${type.h2} mt-3`}>{title}</h2>
        <div className={`${type.body} mt-6`}>{children}</div>
      </div>
    </MotionSection>
  );
}

/** Photo card for services/courses — always a real/generated image, never an icon tile. */
export function MediaCard({ media, title, body, href }: { media: MediaEntry; title: string; body?: string; href?: string }) {
  const inner = (
    <article className="group">
      <div className="aspect-[3/2] overflow-hidden">
        <PremiumImage media={media} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
      </div>
      <h3 className="mt-4 font-[family-name:var(--pv-font-display)] text-[22px]">{title}</h3>
      {body && <p className={`${type.body} mt-2 opacity-80`}>{body}</p>}
    </article>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

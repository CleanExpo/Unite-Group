import Image, { type ImageProps } from 'next/image';
import type { MediaEntry } from './manifest';

export interface PremiumImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  /** Manifest entry — enforces real source + credit. */
  media: MediaEntry;
  /** Hero images load eagerly with fetchpriority=high. */
  hero?: boolean;
  /** Photographic gradient scrim for legible overlaid type (an overlay on a photo, not drawn art). */
  scrim?: 'none' | 'bottom' | 'left' | 'full';
  caption?: string;
  showCredit?: boolean;
}

const scrims = {
  none: '',
  bottom: 'bg-gradient-to-t from-black/75 via-black/25 to-transparent',
  left: 'bg-gradient-to-r from-black/75 via-black/30 to-transparent',
  full: 'bg-black/45',
} as const;

/**
 * Responsive AVIF/WebP image (next.config images.formats should be ['image/avif','image/webp']).
 */
export function PremiumImage({ media, hero, scrim = 'none', caption, showCredit, sizes, className, ...rest }: PremiumImageProps) {
  return (
    <figure className={`relative overflow-hidden ${className ?? ''}`} data-pv-source={media.source}>
      <Image
        src={media.src}
        alt={media.alt}
        fill={!media.width}
        width={media.width}
        height={media.height}
        sizes={sizes ?? (hero ? '100vw' : '(min-width: 1024px) 50vw, 100vw')}
        priority={hero}
        fetchPriority={hero ? 'high' : 'auto'}
        quality={hero ? 82 : 75}
        className="object-cover"
        {...rest}
      />
      {scrim !== 'none' && <div aria-hidden className={`pointer-events-none absolute inset-0 ${scrims[scrim]}`} />}
      {(caption || showCredit) && (
        <figcaption className="absolute bottom-2 right-3 text-[11px] text-white/70">
          {caption}{caption && showCredit ? ' · ' : ''}{showCredit ? media.credit : ''}
        </figcaption>
      )}
    </figure>
  );
}

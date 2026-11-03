// Default marketing page scaffold — copy for every new public page. check-visuals reports a page without PremiumHero + MotionSection, and fails it in enforce mode.
import { PremiumHero, MediaSection, MediaCard, MotionSection, Carousel, type MediaEntry } from '@cleanexpo/premium-visuals';
import manifest from '@/media.manifest.json';

const m = (src: string) => (manifest.entries as MediaEntry[]).find((e) => e.src === src)!;

export default function Page() {
  return (
    <main>
      {/* With video, pass the video's own manifest entry: it carries the poster PremiumVideo shows. */}
      <PremiumHero
        eyebrow="REPLACE — eyebrow"
        title="REPLACE — headline"
        lede="REPLACE — one-sentence promise"
        media={m('/media/hero/REPLACE.mp4')}
        video={[
          { src: '/media/hero/REPLACE.av1.mp4', type: 'video/mp4; codecs=av01.0.05M.08' },
          { src: '/media/hero/REPLACE.webm', type: 'video/webm' },
          { src: '/media/hero/REPLACE.mp4', type: 'video/mp4' },
        ]}
      />
      <MediaSection media={m('/media/sections/REPLACE.avif')} eyebrow="REPLACE" title="REPLACE">REPLACE body copy.</MediaSection>
      <MotionSection className="mx-auto max-w-7xl px-6 py-24">
        <Carousel label="REPLACE" slides={[/* <MediaCard media={m('/media/cards/x.avif')} title="..." /> */]} />
      </MotionSection>
    </main>
  );
}

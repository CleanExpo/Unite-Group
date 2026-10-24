import type { Visual } from './visuals'

/** One picture from the map: the 1280 px file with a 640 px copy for small screens, sized, lazy, with its own alt text. */
export function VisualImg({ visual }: { visual: Visual }) {
  return (
    <img
      src={visual.src}
      srcSet={`${visual.small} 640w, ${visual.src} 1280w`}
      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px"
      alt={visual.alt}
      width={visual.width}
      height={visual.height}
      loading="lazy"
      decoding="async"
    />
  )
}

'use client'

import { useRef, useState } from 'react'

import { AI_LABEL, type Edition } from './editions'

/**
 * One edition: poster at rest, its 4 s clip on hover or tap. Clips use preload="none"
 * so eleven tiles cost eleven posters, not 14 MB of video, until someone asks to watch.
 */
export function EditionTile({ edition }: { edition: Edition }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function play() {
    const v = video.current
    if (!v) return
    if (v.currentTime >= edition.stopAt) v.currentTime = 0
    void v.play().then(() => setPlaying(true), () => setPlaying(false))
  }

  function stop() {
    const v = video.current
    if (!v) return
    v.pause()
    v.currentTime = 0
    setPlaying(false)
  }

  return (
    <article data-edition={edition.name} className="flex flex-col">
      <button
        type="button"
        onMouseEnter={play}
        onMouseLeave={stop}
        onClick={() => (playing ? stop() : play())}
        aria-pressed={playing}
        aria-label={`${playing ? 'Stop' : 'Play'} the ${edition.label} clip`}
        className="group relative block w-full overflow-hidden rounded-sm border border-white/10 bg-[#04080e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e55a2b]"
        style={{ aspectRatio: edition.aspect }}
      >
        <video
          ref={video}
          src={edition.video}
          poster={edition.poster}
          preload="none"
          muted
          playsInline
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= edition.stopAt) {
              e.currentTarget.pause()
              setPlaying(false)
            }
          }}
          onEnded={() => setPlaying(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {!playing && (
          <span
            aria-hidden
            className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-sm bg-black/55 text-white backdrop-blur-sm transition group-hover:bg-[#e55a2b]"
          >
            <svg viewBox="0 0 16 16" className="ml-0.5 h-3.5 w-3.5" fill="currentColor">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          </span>
        )}
      </button>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-white">{edition.label}</h3>
        <a
          href={`/cards/order?edition=${edition.name}`}
          className="shrink-0 text-[13px] font-semibold text-[#ff8a5c] hover:text-white"
        >
          Choose this
        </a>
      </div>
      <p className="mt-1 text-[14px] leading-snug text-stone-300">{edition.line}</p>
      <p className="mt-2 font-mono text-[11px] tracking-[0.06em] text-stone-500">{AI_LABEL}</p>
    </article>
  )
}

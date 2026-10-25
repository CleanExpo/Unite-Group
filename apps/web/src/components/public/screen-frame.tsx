import type { Screen } from './home-screens'
import hs from './home-screens.module.css'

/** One real product screen in a drawn phone or browser frame. The frame is CSS; the file is a plain screenshot. */
export function ScreenFrame({ screen }: { screen: Screen }) {
  return (
    <div className={hs.stage} style={{ '--w': `${screen.cssWidth}px` } as React.CSSProperties}>
      <div className={`${hs.frame} ${screen.frame === 'phone' ? hs.phone : hs.browser}`} style={{ maxWidth: screen.cssWidth }} data-frame={screen.frame}>
        <span className={hs.bar} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={hs.sample}>Sample data</span>
        <img src={screen.src} alt={screen.alt} width={screen.width} height={screen.height} loading="lazy" decoding="async" />
      </div>
    </div>
  )
}

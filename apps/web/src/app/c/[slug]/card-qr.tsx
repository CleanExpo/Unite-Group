import { qrSvg } from '@/lib/card/qr'

import styles from './card.module.css'

/**
 * A QR code for the card's own address, drawn as inline SVG in the server HTML: no script, no image request, nothing
 * to fail on a slow phone. Dark modules on a white tile with the quiet zone inside the viewBox, so it scans on the
 * card's dark page. The address is printed under it for anyone who cannot scan.
 */
export function CardQr({ url, label }: { url: string; label: string }) {
  const { size, path } = qrSvg(url)
  return (
    <figure className={styles.qr} data-card-qr>
      <svg
        className={styles.qrSvg}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={size} height={size} fill="#fff" />
        <path d={path} fill="#000" />
      </svg>
      <figcaption className={styles.qrCaption}>{url.replace(/^https:\/\//, '')}</figcaption>
    </figure>
  )
}

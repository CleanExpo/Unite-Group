import React from 'react'

// Preview renders existing assets directly; Next's optimisation server is not running here.
export default function Image({ src, alt, fill, priority: _priority, unoptimized: _unoptimized, quality: _quality, loader: _loader, ...props }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string | { src: string }; fill?: boolean; priority?: boolean; unoptimized?: boolean; quality?: number; loader?: unknown }) {
  return <img {...props} src={typeof src === 'string' ? src : src.src} alt={alt ?? ''} style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...props.style } : props.style} />
}

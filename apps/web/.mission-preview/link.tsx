import React from 'react'
import { navigate } from './navigation'
export default function Link({ onClick, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href} onClick={event => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target || !href) return
    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return
    event.preventDefault()
    navigate(href)
  }} />
}

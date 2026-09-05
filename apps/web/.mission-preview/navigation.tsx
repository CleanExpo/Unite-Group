import { useMemo, useSyncExternalStore } from 'react'

const eventName = 'mission-preview-navigation'
function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener)
  window.addEventListener('popstate', listener)
  return () => { window.removeEventListener(eventName, listener); window.removeEventListener('popstate', listener) }
}
function currentLocation() { return window.location.pathname + window.location.search + window.location.hash }
export function usePreviewLocation() { return useSyncExternalStore(subscribe, currentLocation, () => '/') }
export function navigate(href: string, replace = false, options?: { scroll?: boolean }) {
  const url = new URL(href, window.location.href)
  if (url.origin !== window.location.origin) { window.location.assign(url.href); return }
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash)
  window.dispatchEvent(new Event(eventName))
  if (options?.scroll !== false) {
    if (url.hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView())
    else { window.scrollTo(0, 0); document.querySelector('main')?.scrollTo(0, 0) }
  }
}
const router = {
  push: (href: string, options?: { scroll?: boolean }) => navigate(href, false, options),
  replace: (href: string, options?: { scroll?: boolean }) => navigate(href, true, options),
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  refresh: () => window.dispatchEvent(new Event(eventName)),
  prefetch: () => {},
}
export function useRouter() { return router }
export function usePathname() { usePreviewLocation(); return window.location.pathname }
export function useSearchParams() { const location = usePreviewLocation(); return useMemo(() => new URLSearchParams(window.location.search), [location]) }

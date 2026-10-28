// IndexNow (UNI-3061). The key is public by design: search engines fetch it from
// https://unite-group.in/<key>.txt to prove the ping came from this site. It is not a secret.
import { SITE_URL } from '@/lib/public-site'

export const INDEXNOW_KEY = 'b79e59e5b8c83f6a68de976c06aaed09' // gitleaks:allow -- public IndexNow key, served at /<key>.txt by design
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`
export const INDEXNOW_KEY_LOCATION = `${SITE_URL}${INDEXNOW_KEY_PATH}`
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/** The IndexNow JSON body for a list of this site's URLs. Foreign hosts are dropped, never sent. */
export function indexNowPayload(urls: readonly string[]) {
  const host = new URL(SITE_URL).host
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: [...new Set(urls)].filter((u) => {
      try {
        return new URL(u).host === host
      } catch {
        return false
      }
    }),
  }
}

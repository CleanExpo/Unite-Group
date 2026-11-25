/**
 * A client card's film is one of our own files under /cards/media/ (UNI-3528). This is the app-side twin of the
 * card_profiles_film_src_local_media CHECK: the database refuses a bad value, and a value that somehow got past it
 * (a restored backup, a service-role write on a database without the migration) still never reaches a page.
 * Same rule in both places: a site path, no '..', no scheme or host, no encoding, no query, 200 characters at most.
 */
const FILM_SRC = /^\/cards\/media\/[A-Za-z0-9._/-]+$/

export function cardFilmSrc(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 200) return null
  if (!FILM_SRC.test(value) || value.includes('..')) return null
  return value
}

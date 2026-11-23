import { describe, expect, it } from 'vitest'

import { cardFilmSrc } from '../film'

describe('cardFilmSrc: the app-side twin of the card_profiles_film_src_local_media CHECK', () => {
  it('passes a file under /cards/media/', () => {
    expect(cardFilmSrc('/cards/media/edition-constellation.mp4')).toBe('/cards/media/edition-constellation.mp4')
    expect(cardFilmSrc('/cards/media/clients/acme/film-1.webm')).toBe('/cards/media/clients/acme/film-1.webm')
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 7],
    ['empty', ''],
    ['a ../ path', '/cards/media/../../etc/passwd'],
    ['an embedded ..', '/cards/media/a/../b.mp4'],
    ['an absolute http URL', 'http://evil.example.invalid/x.mp4'],
    ['an absolute https URL', 'https://evil.example.invalid/cards/media/x.mp4'],
    ['a protocol-relative URL', '//evil.example.invalid/cards/media/x.mp4'],
    ['a path outside /cards/media/', '/other/x.mp4'],
    ['a percent-encoded traversal', '/cards/media/%2e%2e/x.mp4'],
    ['a backslash', '/cards/media/x\\y.mp4'],
    ['a bare directory', '/cards/media/'],
    ['a query string', '/cards/media/x.mp4?evil=1'],
    ['more than 200 characters', `/cards/media/${'a'.repeat(200)}.mp4`],
  ])('refuses %s', (_name, value) => {
    expect(cardFilmSrc(value)).toBeNull()
  })
})

import { CHANGE_PAGES, type ChangePage } from './types'

// Input checks shared by the form and the server action. The database functions repeat the same limits.

export const REQUEST_TEXT_MIN = 5
export const REQUEST_TEXT_MAX = 2000
export const EDIT_NOTE_MAX = 1000
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const
export const PHOTO_BUCKET = 'portal-change-photos'

const PAGE_VALUES: readonly string[] = CHANGE_PAGES.map((p) => p.value)
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export type ChangeInput = { page: unknown; requestText: unknown; photoPath?: unknown }
export type ValidChange = { page: ChangePage; requestText: string; photoPath: string | null }

export function validateChangeInput(input: ChangeInput, tenantSlug: string): { ok: true; value: ValidChange } | { ok: false; error: string } {
  if (typeof input.page !== 'string' || !PAGE_VALUES.includes(input.page)) return { ok: false, error: 'Choose the page you want changed.' }
  const text = typeof input.requestText === 'string' ? input.requestText.trim() : ''
  if (text.length < REQUEST_TEXT_MIN) return { ok: false, error: 'Tell us what you would like changed.' }
  if (text.length > REQUEST_TEXT_MAX) return { ok: false, error: `Please keep it under ${REQUEST_TEXT_MAX} characters.` }
  let photoPath: string | null = null
  if (input.photoPath !== undefined && input.photoPath !== null && input.photoPath !== '') {
    if (typeof input.photoPath !== 'string' || !isOwnPhotoPath(input.photoPath, tenantSlug)) {
      return { ok: false, error: 'That photo did not upload properly. Please add it again.' }
    }
    photoPath = input.photoPath
  }
  return { ok: true, value: { page: input.page as ChangePage, requestText: text, photoPath } }
}

/** A photo path is only ever "<her tenant>/<uuid>.<jpg|png|webp>" inside the private bucket. */
export function isOwnPhotoPath(path: string, tenantSlug: string): boolean {
  return new RegExp(`^${escapeRegExp(tenantSlug)}/${UUID}\\.(jpg|png|webp)$`).test(path)
}

export function photoPathFor(tenantSlug: string, id: string, mimeType: string): string | null {
  const ext = PHOTO_TYPES[mimeType as keyof typeof PHOTO_TYPES]
  if (!ext || !new RegExp(`^${UUID}$`).test(id)) return null
  return `${tenantSlug}/${id}.${ext}`
}

export function validatePhotoFile(file: { size: number; type: string }): string | null {
  if (!(file.type in PHOTO_TYPES)) return 'Please choose a JPG, PNG or WebP photo.'
  if (file.size > PHOTO_MAX_BYTES) return 'That photo is over 5 MB. Please choose a smaller one.'
  if (file.size === 0) return 'That photo file is empty.'
  return null
}

export function validateEditNote(note: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const text = typeof note === 'string' ? note.trim() : ''
  if (!text) return { ok: false, error: 'Tell us what to change in the preview.' }
  if (text.length > EDIT_NOTE_MAX) return { ok: false, error: `Please keep it under ${EDIT_NOTE_MAX} characters.` }
  return { ok: true, value: text }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Shapes for the owner portal connections checklist (UNI-3142 connections; feeds SYN-1375 GBP and SYN-1376 social).
// The table holds a public profile link or a property id only. Never a password, token or API key.

export const CONNECTION_KINDS = ['gsc', 'bing', 'gbp', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x'] as const
export type ConnectionKind = (typeof CONNECTION_KINDS)[number]

export const CONNECTION_STATUSES = ['not_started', 'link_saved', 'access_granted', 'verified'] as const
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number]

/** GSC and Bing take a property id; everything else takes a public profile link. */
export const PROPERTY_KINDS: readonly ConnectionKind[] = ['gsc', 'bing']
/** The three where the owner adds our account on Google's or Microsoft's own screen. */
export const ACCESS_KINDS: readonly ConnectionKind[] = ['gsc', 'bing', 'gbp']

export type Connection = {
  kind: ConnectionKind
  status: ConnectionStatus
  /** The saved public link or property id, shown back to the owner. Never a secret. */
  value: string | null
  notes: string | null
  updatedAt: string | null
}

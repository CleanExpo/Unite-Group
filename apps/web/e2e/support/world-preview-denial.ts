import { expect, type Page } from '@playwright/test'

// The one place these tests name the heading of src/app/not-found.tsx. Main changed its
// wording from "Page Not Found" to "Page not found" (UNI-3018), so letter case is ignored.
export const NOT_FOUND_HEADING = /^page not found$/i

/** Assert the final disabled view, never the loading shell or HTTP status alone. */
export async function expectWorldPreviewDenied(page: Page, status: number | undefined, timeout = 5_000) {
  // Next.js may stream notFound() with status 200 after its loading boundary.
  // https://nextjs.org/docs/app/api-reference/file-conventions/not-found
  expect([200, 404]).toContain(status)
  await expect(page.getByRole('heading', { name: NOT_FOUND_HEADING })).toBeVisible({ timeout })
  await expect(page.getByRole('region', { name: 'Fictional Restoration World playtest' })).toHaveCount(0, { timeout })
  await expect(page.getByRole('button', { name: 'Start fictional playtest' })).toHaveCount(0, { timeout })
}

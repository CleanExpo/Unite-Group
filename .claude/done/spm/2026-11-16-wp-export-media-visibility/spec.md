# SPM Micro-spec: wp-export media visibility

<!-- header (append-only): created 2026-11-16T04:12Z by the side session started from local_0e3ab3e3 (Opus 5.5). Split out of 2026-11-16-website-client-flow because the engineering gate allows two review rounds per spec. Supersedes the media part of that spec's flow item (2) only; pages and posts keep its exact-count rule unchanged. -->

## Evidence that forced it

A real export of https://wordpress.org/news on 16/11/2026 returned pages 2 of 2 and posts 1,119 of 1,119, and media 1,698 against an `X-WP-Total` of 1,735, with every page HTTP 200 and no id listed twice. The parent spec's rule stopped that export with nothing written, so the tool could not migrate a large, healthy WordPress site.

WordPress core sets `X-WP-Total` from the query's `found_posts`, then drops each item that fails `check_read_permission`; an attachment with status `inherit` takes its parent's readability, so images attached to draft or private posts are counted but never listed (`WP_REST_Posts_Controller::get_items` and `::check_read_permission`, wordpress-develop trunk, read 16/11/2026).

## Container

`scripts/website/lib/wordpress.mjs`, function `exportEndpoint` and the log in `wpExport`. Tests in `scripts/__tests__/client-site.test.mjs`.

## Behaviour

- Pages and posts must still return exactly `X-WP-Total` items.
- Media may return fewer than `X-WP-Total`; the export then records media as `visible-only` with the hidden count in `export-summary.json`.
- Any endpoint returning more items than its total stops the export with nothing written.
- Any endpoint listing the same id twice stops the export with nothing written.
- Every later page must report the same `X-WP-Total` and `X-WP-TotalPages` as page 1, otherwise the export stops with nothing written, so an item deleted mid-read is never taken for a hidden one.
- Media that lists nothing against a non-zero total counts as blocked.
- Media is a reference list (id, slug, source_url, alt_text, mime_type) for migration and is never copied into the public site.

## UI

One extra line on the terminal when media is short: `WARNING: media: <n> item(s) counted by WordPress but hidden from anonymous readers (usually attached to a draft or private post); recorded as visible-only`.

## Kicker

The pass is no longer "every count matched". It is "pages and posts complete, the list held still while it was read, and the media shortfall is named". A shortfall that cannot be told apart from a read fault still stops the export.

## Acceptance

- `node --test scripts/__tests__/client-site.test.mjs` passes, including the tests "wp-export records media WordPress hides from anonymous readers as visible-only and still writes", "wp-export still stops on a short post list, a list longer than its total, or an item listed twice", "wp-export stops when a later page reports a different total, so a deletion mid-read is never taken for hidden media" and "wp-export treats media that lists nothing against a non-zero total as blocked".
- Mutation controls (i) to (l) in the evidence folder's `mutations.md` each show the named test green on the code and red with the rule removed.
- A real export of https://wordpress.org/news exits 0 and prints the `WARNING:` line, recorded in the evidence folder's `wp-export-real.log`.

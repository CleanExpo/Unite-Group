# Business Card gold standard: recipe

Picked by Phill on 24/10/2026 from the five-page gallery. His message: "A".

Reference: Wave Metal Smart Business Card, https://wavecards.com.au/product/metal-smart-business-card/
Captured 24/10/2026 on the Mac Mini in headless Chromium (desktop 1440 wide, phone 390 wide).
Files: reference-desktop.png, reference-mobile.png (SHA-256 in design.lock.json).
These images are for studying the pattern only. Nothing from them is copied into our build.

## What to take from it

1. Dark, quiet page. Near-black background, one cool accent for actions, no bright gradients.
2. The object is the hero. The card is shot like jewellery: low light, a single highlight, deep
   shadow, on a rich textured surface. For us the hero is the business card film itself, framed
   the same way.
3. A short, heavy headline at the top left, one plain line under it, then two buttons: the main
   action filled, the second one outlined.
4. Buy box right beside the hero: product name, one price, a short paragraph, choices (colour
   swatches for them, edition choice for us), quantity, one full-width button.
5. A thumbnail strip under the hero image, so you can look at it from other angles before buying.
6. A sticky bar with the product name, price and button appears once you scroll past the buy box.
7. A thin row of four plain facts under the buy box (who it is for, how fast, what is free).
8. Then one big statement section ("No app needed") with lots of space around it.
9. On the phone: the hero image first, full width, then name, price, choices and the button. The
   button is always within one thumb-scroll.

## What never to copy

Wave's name, logo, words, photos, product shots, prices or icons. We use our own films, our own
brand tokens (bespoke CSS Modules house style, not the Tailwind look), our own copy in Australian
English, and our real prices (Ready-made AUD 249, Made for you AUD 449, GST included).

## How it is checked

Every build of /cards and /cards/order is screenshotted at both widths and shown next to these
reference images. Pixel matching is against our own approved render, never against Wave's page.

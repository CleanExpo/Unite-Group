# Ten clips in a week: where the Stripe payment link goes

Nothing here was done in Stripe or Vercel. The page `/video/ten-clips` (founder authority 30/10/2026) has no pay button yet.
Its only call to action is the enquiry form, which posts to `/api/leads` with `interests: "ten-clips"`, so the request
reaches `contact@unite-group.in` through the existing lead path.

When Phill creates the Stripe Payment Link (A$1,490, GST included, one-off; the monthly option is 6 clips for A$590):

1. Set the link's `https://buy.stripe.com/...` URL in the project environment variable `STRIPE_PAYMENT_LINK_VIDEO_TEN_CLIPS` (same pattern as `STRIPE_PAYMENT_LINK_CARD_*`).
2. Add a pay button in `src/app/video/ten-clips/page.tsx` that reads it with `stripePaymentLink()` from `src/app/grow/packages.ts` and shows only when set (see `/grow` and `paymentLinkFor`). The placeholder comment is in `offer.ts`.
3. An environment change needs a code change to build (a redeploy of the same SHA is skipped).
4. If a different company takes the payment, the page needs a payment-entity line first (see `src/app/cards/payment-entity.ts`).

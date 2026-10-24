# Card payment links: getting the order reference and the thank-you page onto them

UNI-2996 B5. This is Phill's Stripe step. The code does not change the links, and nothing here was done in Stripe.
Do it in Stripe TEST mode first and pay with a Stripe test card before touching the live links.

## What the code now does

When Stripe sends `checkout.session.completed` to `/api/webhooks/stripe`, a paid session whose amount is A$249 or A$449
(the two `CARD_TIERS` in `src/app/cards/order/order-view.tsx`) becomes one `card_orders` row and one email to
`LEAD_ALERT_EMAIL_TO` with the buyer's name and the tier only. The order's reference is the session's
`client_reference_id`; if the link carried none, it is the checkout session id (`cs_...`). The same event arriving twice
changes nothing the second time. If the price of a tier changes, change `CARD_TIERS`; the match is on AUD amount.

## Steps in Stripe

1. **Webhook endpoint.** Dashboard, Developers, Webhooks: the endpoint `https://unite-group.in/api/webhooks/stripe` must be
   subscribed to `checkout.session.completed` (it only receives events you select). Its signing secret is the existing
   `STRIPE_WEBHOOK_SECRET`.
2. **Send the buyer to the thank-you page.** For each of the two Payment Links (Ready-made, Made for you): edit the link,
   "After the payment", choose "Don't show confirmation page", "Redirect customers to your website", and enter
   `https://unite-group.in/cards/thanks?session_id={CHECKOUT_SESSION_ID}`. Stripe replaces `{CHECKOUT_SESSION_ID}` with the
   real session id. The page finds the order by it, so this works even when the link has no `client_reference_id`.
3. **Optional: tie a payment to a person.** When you send someone a link by email, add `?client_reference_id=<value>` to the
   link, for example `https://buy.stripe.com/xxxx?client_reference_id=sample-plumbing-2610`. Use letters, digits, `-` and `_`
   only, at most 200 characters, and a different value for every buyer. That value becomes the order's reference. The
   public links on the website carry none, so their orders use the session id.
4. **Do not use a reference twice.** If two orders share a reference, the thank-you page refuses to guess and asks the buyer
   to contact us.

## Environment (Vercel project)

| Name | Needed for |
|---|---|
| `LEAD_ALERT_EMAIL_TO` | the address that receives the order alert; unset means no email, the order is still recorded |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | the existing mail sender the alert uses |
| `FOUNDER_USER_ID` | already set; the order's owner |
| `STRIPE_WEBHOOK_SECRET` | already set |

## Database

`supabase/migrations/20261025100000_card_orders.sql` creates `card_orders` and `card_order_intakes`. It is founder-gated and
has not been applied anywhere. Until it is applied, the webhook answers 500 for a paid card order (so Stripe retries and
nothing is lost), and the thank-you form cannot save.

## Check it end to end (test mode)

Pay a test-mode link with Stripe's test card, then confirm: one `card_orders` row, one alert email, the redirect landing on
`/cards/thanks?session_id=cs_test_...`, and a submitted intake appearing as one `card_order_intakes` row. Resend the same
event from the dashboard: still one row and no second email.

## Not built

Logo upload. The thank-you form checks the chosen file (PNG, JPEG, WebP, SVG, up to 5 MB) but does not send or store it;
there is no public upload path that is safe yet (`TODO(logo-upload)` in `src/app/cards/thanks/intake-form.tsx`). The
confirmation tells the buyer we will email to collect the logo.

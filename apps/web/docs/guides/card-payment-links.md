# Card payment links: getting the order reference and the thank-you page onto them

UNI-2996 B5. This is Phill's Stripe step. The code does not change the links, and nothing here was done in Stripe.
Do it in Stripe TEST mode first and pay with a Stripe test card before touching the live links.

## What the code now does

When Stripe sends `checkout.session.completed` to `/api/webhooks/stripe`, a paid session that came from one of the two card
Payment Links (listed in `STRIPE_CARD_PAYMENT_LINK_IDS`) and whose amount is A$249 or A$449
(the two `CARD_TIERS` in `src/app/cards/order/order-view.tsx`) becomes one `card_orders` row and one email to
`LEAD_ALERT_EMAIL_TO` with the buyer's name and the tier only. The order's reference is the session's
`client_reference_id`; if the link carried none, it is the checkout session id (`cs_...`). The reference is only a label for
you: the thank-you form is tied to the order by the checkout session id alone, never by the reference. The same event arriving twice
changes nothing the second time. If the price of a tier changes, change `CARD_TIERS`; the match is on AUD amount.

## Steps in Stripe

1. **Webhook endpoint.** Dashboard, Developers, Webhooks: the endpoint `https://unite-group.in/api/webhooks/stripe` must be
   subscribed to `checkout.session.completed` (it only receives events you select). Its signing secret is the existing
   `STRIPE_WEBHOOK_SECRET`.
2. **Send the buyer to the thank-you page.** For each of the two Payment Links (Ready-made, Made for you): edit the link,
   "After the payment", choose "Don't show confirmation page", "Redirect customers to your website", and enter
   `https://unite-group.in/cards/thanks?session_id={CHECKOUT_SESSION_ID}`. Stripe replaces `{CHECKOUT_SESSION_ID}` with the
   real session id. The page finds the order by that session id alone, so this works whether or not the link has a `client_reference_id`. Without `session_id` in the address the form does not appear. When Stripe recorded the buyer's email, the email typed into the form must match it.
3. **Optional: label a payment for yourself.** When you send someone a link by email, you may add
   `?client_reference_id=<value>` to the link, for example `https://buy.stripe.com/xxxx?client_reference_id=sample-plumbing-2610`
   (letters, digits, `-` and `_` only, at most 200 characters). It is stored as the order's `reference` so you can recognise the
   order. It is NOT a key to anything: a readable value can be guessed, so the thank-you form never accepts it, and the buyer
   page works only from the unguessable `session_id` Stripe puts in the redirect (step 2).

## Environment (Vercel project)

| Name | Needed for |
|---|---|
| `MAILTRAP_API_KEY` | Mailtrap Email Sending API key; without it the order is still recorded but no alert is sent |
| `LEAD_ALERT_EMAIL_TO` | the address that receives the order alert; defaults to `contact@unite-group.in` when unset |
| `MAILTRAP_FROM_EMAIL` | optional sender override; defaults to `contact@unite-group.in` |
| `STRIPE_CARD_PAYMENT_LINK_IDS` | the two card Payment Link ids (`plink_...`, from each link's page in the Stripe dashboard), comma-separated. Not secret. Unset means no order is recorded: the price alone never counts, so another product at A$249 or A$449 cannot become a card order |
| `STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS` | the add-on's `https://buy.stripe.com/...` URL; its presence shows the extra-business control on `/cards/order` |
| `STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID` | the add-on link's single `plink_...` id. Not secret. Lets the webhook record add-on payments; unset means none is ever recorded |
| `FOUNDER_USER_ID` | already set; the order's owner |
| `STRIPE_WEBHOOK_SECRET` | already set |

## Extra-business add-on

Each extra business is A$199, up to 5, bought on its own Payment Link (a link URL cannot carry a quantity). In Stripe, TEST mode first:

1. Create a product "Extra business" at AUD 199, one-off, with the same tax setting as the existing card links. The order page and terms say "GST included", so check that setting is what makes that true.
2. Create a Payment Link for it with "Let customers adjust quantity" enabled, minimum 1 and maximum 5.
3. Leave the confirmation as Stripe's own page (no redirect to `/cards/thanks`): the thank-you intake form would otherwise attach to the add-on order.
4. Apply `supabase/migrations/20261025200000_card_orders_extra_business.sql` first (founder-gated; until then add-on orders fail to insert, the webhook answers 500 and Stripe retries).
5. Set `STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS` (the `https://buy.stripe.com/...` URL) and `STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID` (the `plink_...` id).

The webhook records a payment from that link as tier `extra_business` with the quantity worked out from the amount (1 to 5 x A$199). A discounted or odd amount on that link is not recorded (a warning is logged). An add-on payment is not linked to the Made for you order automatically; match it by buyer name or email.

## Database

`supabase/migrations/20261025100000_card_orders.sql` creates `card_orders` and `card_order_intakes`. It is founder-gated and
has not been applied anywhere. Until it is applied, the webhook answers 500 for a paid card order (so Stripe retries and
nothing is lost), and the thank-you form cannot save.

## Check it end to end (test mode)

Pay a test-mode link with Stripe's test card, then confirm: one `card_orders` row, one alert email, the redirect landing on
`/cards/thanks?session_id=cs_test_...`, and a submitted intake appearing as one `card_order_intakes` row. Resend the same
event from the dashboard: still one row and no second email.

## What the thank-you form collects

Film (any of the ten showroom films, or Made for you), name, business, email, the contact details to show at the end of
the film, an optional logo link, an optional Made-for-you brief and where you met. The whole submission is stored in `card_order_intakes`
first (that insert is the claim, one per order), then the claim winner emails `LEAD_ALERT_EMAIL_TO` (default
contact@unite-group.in) via Mailtrap with the film and details, reply-to the buyer.

`delivery_state` on the row is `pending` (stored, not yet emailed), `sent` (with `provider_message_id` and
`delivered_at`) or `failed`. If the email fails the buyer still sees a success (HTTP 202), their details stay stored, and
a second submit gets 409. Find rows whose alert did not go out and follow them up by hand:
`select id, created_at, name, email, film, delivery_state from card_order_intakes where delivery_state <> 'sent' order by created_at;`
This needs migration `20261030120000_card_order_intakes_payload_delivery.sql` (founder-gated; apply it before the route deploys).

## Not built

Logo upload. There is no public upload path that is safe yet, so the form takes a link to the logo, and tells the buyer
to reply to the payment receipt email with the file if they have no link.
# Late eng-failure seat report (arrived 24/10 ~15:15, written against spec rev 1)

Already covered in rev 4: unalerted reconciliation, the atomic claim (self-match and double-click), FOUNDER_USER_ID on the checkout path, and signal/abort timeouts (check them at build).
NOT yet explicit in rev 4. The builder MUST apply this:
- Test oracle: the dedup/claim fake holds real rows (including the just-inserted one) and filters on the predicates it actually receives. A null-returning mock is forbidden.
- Red control: remove the ordering/id exclusion (or the unique-key claim) and watch AC-7 fail.
- Cases to include: same email with the same captured_at gives exactly one alert; a claim-query error still sends the alert (fail toward a duplicate, never silence); an alert in flight when the function dies leaves the event `unalerted` even though the Stripe 23505 retry returns 200.
- Unconfirmed: whether @sendgrid/mail exposes a client timeout. Check node_modules/@sendgrid/mail/src/mail.d.ts after install.

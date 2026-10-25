# Operator note for Phill: enquiry alerts (UNI-2999)

Names only. No values appear here or anywhere in the branch.

## Order
1. Apply the database migrations first, on a Supabase branch, then production once approved: `20261024090000_alert_delivery_log.sql`, then `20261025000000_alert_erasure.sql`. The erasure migration ships before or with this code. Without it the erase route returns 500 and reports nothing erased.
2. Set the environment variables below in Vercel (Production and Preview with different values for the destination and the secrets).
3. Merge and deploy the code.
4. Add `ALERT_HEALTH_TOKEN` as a GitHub Actions secret so the daily heartbeat can read the alert health route.

## Environment variables
| Name | Notes |
|---|---|
| `LEAD_ALERT_EMAIL_TO` | Production: contact@unite-group.in. Preview: a separate test address. |
| `SENDGRID_FROM_EMAIL` | Verified sender. |
| `SENDGRID_API_KEY` | Needs Mail Send and the Suppressions Read scope. Without Suppressions Read the destination check reports `unknown`. |
| `ALERT_DEDUP_SECRET` | Server secret for the duplicate-detection hash. Unset means no duplicate suppression, never a missed alert. |
| `ALERT_HEALTH_TOKEN` | Must differ from `CRON_SECRET`; the route returns 500 if they match. |
| `CRON_SECRET` | Existing; fallback bearer only when `ALERT_HEALTH_TOKEN` is unset. |
| `FOUNDER_USER_ID` | Existing; owner of the log rows. |
| `NEXT_PUBLIC_APP_URL` | Existing; base of the link in the email (defaults to https://unite-group.in). |

The alert is email only, to the one address above, and carries the first name, business name, the package asked for, a sign-in link and the lead reference. Nothing else.

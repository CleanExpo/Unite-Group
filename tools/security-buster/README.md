# Security Buster

Red-team review of **our own** code through abliteration.ai. Advisory only: findings never clear or block a release.

```bash
# from repo root
node --env-file=tools/security-buster/.env.local tools/security-buster/buster.mjs            # all approved files
node tools/security-buster/buster.mjs --dry-run                                                # show what would be sent
node tools/security-buster/buster.mjs apps/web/src/app/api/foo/route.ts --max-requests 5       # specific files
```

Guards:
- Only files in `approved.json` are sent. Anything else is refused (exit 2). Never add `.env`, secrets or customer data.
- Caps: `--max-requests` (default 25; counts every API call, retries included, so it is a hard cap), `--max-chars` per file (60000), `--daily-token-cap` (500000, tracked in `.ledger.jsonl`).
- The daily token cap is checked before every API call, retries included. A reply with no usage figure is booked at the whole cap, so no more calls go out that day. Two runs at once can still race on the ledger: run one at a time.
- Files are read without following symlinks anywhere in their path, so a link at an approved path cannot send another file out.
- Options that need a value refuse a missing one (`--out --dry-run` is an error, not an output folder named `--dry-run`). Caps must be whole numbers.
- Fail-closed: missing key exits 3 (UNAVAILABLE); any HTTP/parse error marks that file NOT reviewed and exits 1. An unreviewed file is never reported clean.
- Output: `report/report.md` (ranked by severity) and `report/findings.json`. Both are gitignored.

Positive control: `test/fixtures/vulnerable.js` holds 4 planted holes (SQL injection, command injection, XSS, missing auth). A live run must find all 4; if it misses any, that file is reported `control-failed` and the run exits 1.

Reasoning is off by default (`ABLITERATION_REASONING_EFFORT=none`); with it on, the model can spend its whole output budget thinking and return nothing.

Replies are requested in strict JSON mode; a file whose reply still fails to parse after one retry is reported NOT reviewed.

Tests: `node --test tools/security-buster/test/buster.test.mjs`
Key: `ABLITERATION_API_KEY` in `tools/security-buster/.env.local` (gitignored), supplied via `room-cli secret request`.
Founder authorised this API-key lane on 03/11/2026 (exception to "accounts not API calls", scoped to this tool).

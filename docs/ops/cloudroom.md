# Cloudroom on the MacBook and the Mac Mini

How Cloudroom is set up on Phill's two Macs, how it survives restarts, which account each lane uses, and how to put it back. No secrets live in this file or this folder: sign-ins stay in Cloudroom's own store and the macOS Keychain.

Last checked: 24/10/2026, Cloudroom 0.43.1 on both Macs.

## What runs where

| Piece | MacBook | Mac Mini |
|---|---|---|
| Cloudroom app and local server (`127.0.0.1:39886`) | yes | yes |
| Data folder | `~/.gui-cloudroom` | `~/.gui-cloudroom` (points to the external SSD) |
| Cloud link (`room-cli cloud status`) | connected, Cloudroom account support@carsi.com.au | same |
| Codex in Cloudroom (`room-cli cloud codex status`) | connected | connected |
| Cursor in Cloudroom (`room-cli cloud cursor status`) | connected | connected |

## Accounts and lanes

Owner rule (Phill, 24/10/2026): each account has one fixed lane. Near a limit, that lane's work waits for the reset. Never switch accounts to get around a limit. Never put a Claude subscription login into a third-party tool.

| Lane | Account | Where it is set |
|---|---|---|
| Claude in Cloudroom, both Macs | Contact@unite-Group (contact@unite-group.in) | Cloudroom > Settings > Agents > Claude Code > Use, or `cloudroom_accounts.py use unite` |
| Codex in Cloudroom, both Macs | ChatGPT plan, phill.mcgurk@gmail.com sign-in | Cloudroom > Settings > Agents > Codex |
| Claude Code CLI on the Mini (tmux `lead`) | the Mini CLI's own login (`claude auth status`) | `claude auth login` on the Mini; Phill should sign it in as contact@unite-group.in |

Other Claude accounts are still stored in Cloudroom (airestoreassist@gmail.com, Phill.McGurk, support@synthex.social and, on the Mini, "Synthex Main Account"). They are not used unless someone presses Use on them.

### Cloudroom does not hop accounts

Cloudroom 0.43.1 has no automatic account switching. Its built-in guide says every thread uses the account in use and "nothing switches automatically". When a turn hits a usage limit, the Accounts plugin records `limitedUntil` for that account and the built-in `provider-retry` plugin re-queues the turn on the same account after the reset. The only retry setting is `maximumWait` (6 hours on both Macs): `room-cli plugin config provider-retry`.

### Terms of service

Cloudroom runs the official `claude` CLI under each stored account with that account's own settings folder. It does not pass a Claude subscription login to a third-party model or proxy.

## Surviving restarts and crashes

Each Mac has a per-user LaunchAgent, `~/Library/LaunchAgents/dev.unitegroup.cloudroom-keepalive.plist` (a copy is in `scripts/ops/cloudroom/`):

- `RunAtLoad`: Cloudroom starts when Phill logs in.
- `KeepAlive.SuccessfulExit = false`: launchd restarts Cloudroom after a crash. A normal Quit stays quit.
- `ThrottleInterval 15`: at most one restart every 15 seconds.

Install or reinstall on a Mac:

```bash
cp scripts/ops/cloudroom/dev.unitegroup.cloudroom-keepalive.plist ~/Library/LaunchAgents/
launchctl bootout gui/$(id -u)/dev.unitegroup.cloudroom-keepalive 2>/dev/null
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dev.unitegroup.cloudroom-keepalive.plist
```

Crash test run on 24/10/2026: the Cloudroom main process was killed with `kill -9` on each Mac. launchd started a new process (MacBook 45886 to 47469, Mini 89127 to 90875), the server answered on port 39886 again, and `room-cli cloud status` said "Cloud connected". A full reboot test has not been run yet.

To remove: `launchctl bootout gui/$(id -u)/dev.unitegroup.cloudroom-keepalive` and delete the plist.

## Seeing accounts and usage

`scripts/ops/cloudroom/cloudroom_accounts.py list` prints each Claude account (id, name, email, plan, in use, `limitedUntil`, usage windows with reset times) without any token. It never echoes raw room-cli output or an account's error text (it prints only `error=yes` or `none`), and `use` exits non-zero unless the account list afterwards shows only the chosen account in use. Checks: `python3 -m unittest scripts/ops/cloudroom/test_cloudroom_accounts.py`. Cloudroom refreshes usage every 5 minutes, only for the account in use, so blank usage on other accounts means unknown, not zero.

Fields available for a dashboard (Mission Control / Pi-Dev-Ops):
- `accounts.list` (plugin RPC): `id, name, email, plan, inUse, limitedUntil, error, credits, windows[{label, usedPercent, resetsAt}], needsSignIn`.
- `room-cli settings usage`: `status, accountEmail, planLabel, windows[{label, usedPercent, resetsAt}], credits`.

## Putting it back after a failure

1. Is the app up? `lsof -nP -iTCP:39886 -sTCP:LISTEN`. If not, `launchctl kickstart -k gui/$(id -u)/dev.unitegroup.cloudroom-keepalive`.
2. Cloud link: `room-cli cloud status`, `room-cli cloud codex status`, `room-cli cloud cursor status`.
3. Account in use: `cloudroom_accounts.py list`; pin with `cloudroom_accounts.py use unite`.
4. A sign-in that has expired needs Phill once, through Cloudroom's own flow (Settings > Agents > the provider > Sign in).

## Known dates

- 29/10/2026 20:09 AEST: Cloudroom's ChatGPT/Codex sign-in expires. Re-sign in before then.
- The stored Claude sign-ins were issued as one-year logins in October 2026.

## What went wrong on 24/10/2026

Cloudroom was not running on either Mac: it was closed or crashed on the MacBook after 21/10, and the Mini rebooted at about 10:00 on 24/10 without restarting it. No sign-in had expired. The keep-alive agent above is the fix.

# Safe Machine Activity Collector

This collector powers the Founder Command Centre’s fixed **three computers × two logical screens** view.

It is deliberately **not** screen sharing. “Screen 1” and “Screen 2” are stable logical work lanes populated from at most two live Hermes session leases on each computer. They do not claim to identify a physical monitor or the application visible on it.

## Privacy boundary

The collector reads only Hermes’ content-free active-session lease registry:

- specific leased PID liveness;
- lease start ordering;
- existence of up to two active Hermes surfaces.

It never reads or sends:

- pixels, screenshots or video;
- prompts, messages, transcripts or session titles;
- commands, command lines or process lists;
- window titles, clipboard, browser URLs or file paths;
- lease IDs, session IDs, PIDs or arbitrary metadata.

The wire payload is a strict two-screen schema of enums, an opaque boot UUID, a monotonic sequence and observation time. The server maps the device identity from its bearer token and rejects unknown fields.

## Prerequisites

1. The web change is deployed and `FOUNDER_USER_ID` is correct.
2. Vercel has optional server-only `MACHINE_ACTIVITY_DEVICE_TOKENS` configured as JSON:

   ```json
   {
     "unite-mac-mini": "unique-random-token-1",
     "phill-macbook-pro": "unique-random-token-2",
     "phill-desktop": "unique-random-token-3"
   }
   ```

   Tokens must be unique and at least 32 characters. Never commit or paste them into tickets or chat.
3. Each computer receives only its own token.
4. `python3`/`python.exe` and `hermes` are on PATH.

The endpoint is dormant and returns 401 until tokens are configured. Production env changes and deployment remain approval-gated.

## macOS install

From this directory on the target Mac:

```bash
chmod 700 install-macos.sh
./install-macos.sh https://<founder-app>/api/agents/machine-activity
```

The installer prompts with hidden input, stores the token only in a mode-600 LaunchAgent plist, copies the collector to `~/Library/Application Support/UniteGroup/MachineActivity/`, enables Hermes’ lease registry with `max_concurrent_sessions=16`, and starts `com.unitegroup.machine-activity`.

Verify:

```bash
launchctl print gui/$(id -u)/com.unitegroup.machine-activity
```

Uninstall:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.unitegroup.machine-activity.plist
rm ~/Library/LaunchAgents/com.unitegroup.machine-activity.plist
rm -rf ~/Library/Application\ Support/UniteGroup/MachineActivity
```

## Windows install

Run PowerShell as the normal Hermes user, not SYSTEM:

```powershell
.\install-windows.ps1 -Endpoint 'https://<founder-app>/api/agents/machine-activity'
```

The token is stored with user-scoped DPAPI in `%LOCALAPPDATA%\UniteGroup\MachineActivity\device-token.clixml`; it is not embedded in the task action. The task runs with limited privileges at user logon.

Verify:

```powershell
Get-ScheduledTask -TaskName 'UniteGroup Machine Activity' | Get-ScheduledTaskInfo
```

Uninstall:

```powershell
Unregister-ScheduledTask -TaskName 'UniteGroup Machine Activity' -Confirm:$false
Remove-Item "$env:LOCALAPPDATA\UniteGroup\MachineActivity" -Recurse -Force
```

## Freshness contract

- **connected:** server receipt is under 30 seconds old;
- **stale:** 30 seconds to under 5 minutes;
- **offline:** 5 minutes or older;
- **not reporting:** no valid trusted event exists.

When a machine is stale or offline, the dashboard suppresses its last activity fields and never presents them as current.

## Local tests

```bash
python3 test_collector.py
```

The app-side tests live beside the contract, ingest route and React component.

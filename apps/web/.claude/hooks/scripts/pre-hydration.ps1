# Compatibility shim for older Windows/PowerShell callers.
# Canonical Minion pre-hydration lives in pre-hydration.mjs so the same
# deterministic implementation runs on Windows, macOS and Linux.

param(
    [Parameter(Mandatory=$true)]
    [string]$TaskText
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "pre-hydration.mjs"

if (-not (Test-Path $nodeScript)) {
    Write-Error "Canonical pre-hydration script not found: $nodeScript"
    exit 2
}

& node $nodeScript --task $TaskText
exit $LASTEXITCODE

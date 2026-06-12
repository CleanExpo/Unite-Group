# alias-guard.ps1 — PreToolUse hook (Cursor requires JSON on stdout for every response)

$ErrorActionPreference = 'SilentlyContinue'
$registryPath = "D:\Unite-Hub\.portfolio\PORTFOLIO.yaml"

function Write-HookJson($obj) {
  $json = $obj | ConvertTo-Json -Compress -Depth 5
  [Console]::Out.WriteLine($json)
}

function Emit-Allow { Write-HookJson @{ permission = 'allow' }; exit 0 }

function Emit-Deny($reason) {
  Write-HookJson @{
    permission    = 'deny'
    user_message  = $reason
    agent_message = $reason
    decision      = 'block'
    reason        = $reason
  }
  exit 0
}

try { $stdin = [Console]::In.ReadToEnd() } catch { Emit-Allow }
if (-not $stdin) { Emit-Allow }
try { $event = $stdin | ConvertFrom-Json } catch { Emit-Allow }

$tool = "$($event.tool_name)"
$evtInput = $event.tool_input
$guardedTools = @('Bash', 'Shell', 'PowerShell', 'Write')
if ($guardedTools -notcontains $tool) { Emit-Allow }
if ($env:PORTFOLIO_GUARD_BYPASS -eq '1') { Emit-Allow }
if (-not (Test-Path $registryPath)) { Emit-Allow }

$registryRaw = Get-Content $registryPath -Raw
$blockedPaths = @()
$ms = [regex]::Matches($registryRaw, "(?m)^\s+-\s+['""]?(D:\\[^'""\r\n]+)['""]?")
foreach ($m in $ms) {
  $p = $m.Groups[1].Value.TrimEnd('\', '/').ToLower()
  if ($p -match '^d:\\') { $blockedPaths += $p }
}
$cleanExpoRepos = @('Unite-Hub', 'Unite-Group', 'RestoreAssist', 'Disaster-Recovery', 'DR-NRPG', 'CCW-CRM', 'Synthex', 'ATO', 'CARSI', 'Pi-Dev-Ops')

$cmd = ''
if ($tool -in @('Bash', 'Shell', 'PowerShell')) { $cmd = "$($evtInput.command)" }
elseif ($tool -eq 'Write') {
  $cmd = "$($evtInput.file_path)"
  if (-not $cmd) { $cmd = "$($evtInput.path)" }
}
if (-not $cmd) { Emit-Allow }
$cmdLower = $cmd.ToLower()

foreach ($bp in $blockedPaths) {
  if ($cmdLower.Contains($bp)) {
    Emit-Deny "Refusing: path '$bp' is in registry do_not_clone_to[]. Bypass: PORTFOLIO_GUARD_BYPASS=1."
  }
}
if ($cmdLower -match 'git\s+clone[^\r\n]*cleanexpo/([a-z0-9_-]+)(\.git)?\s+([^\s]+)') {
  $repo = $matches[1]
  $target = $matches[3].Trim('"', "'").TrimEnd('\', '/').ToLower()
  if ($cleanExpoRepos | Where-Object { $_.ToLower() -eq $repo.ToLower() }) {
    $canonical = "d:\$($repo.ToLower())"
    if (-not $target.StartsWith($canonical)) {
      Emit-Deny "Refusing clone CleanExpo/$repo to '$target'. Canonical: $canonical."
    }
  }
}
if ($cmdLower -match '(mkdir|new-item[^\r\n]*directory)[^\r\n]*(d:\\unite[\s-]?group[^\\]|d:\\unite[\s-]?hub[\s_])') {
  if ($cmdLower -match 'd:\\unite-hub\\|d:\\unite-group\\|d:\\authority-site') { Emit-Allow }
  Emit-Deny 'Refusing new D:\Unite* directory. Use canonical registry paths.'
}
Emit-Allow

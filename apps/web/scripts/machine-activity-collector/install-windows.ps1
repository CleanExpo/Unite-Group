[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://.+/api/agents/machine-activity$')]
    [string]$Endpoint
)

$ErrorActionPreference = 'Stop'
$python = (Get-Command python.exe -ErrorAction Stop).Source
$hermes = (Get-Command hermes.exe -ErrorAction Stop).Source
$source = Join-Path $PSScriptRoot 'collector.py'
$installDir = Join-Path $env:LOCALAPPDATA 'UniteGroup\MachineActivity'
$collector = Join-Path $installDir 'collector.py'
$credentialPath = Join-Path $installDir 'device-token.clixml'
$runnerPath = Join-Path $installDir 'run-collector.ps1'
$taskName = 'UniteGroup Machine Activity'

$secureToken = Read-Host 'Device token (input hidden)' -AsSecureString
$credential = [System.Management.Automation.PSCredential]::new('device-token', $secureToken)
$plainLength = $credential.GetNetworkCredential().Password.Length
if ($plainLength -lt 32) {
    throw 'Device token must contain at least 32 characters'
}

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Copy-Item -Force $source $collector
$credential | Export-Clixml -Path $credentialPath -Force

$runner = @'
$ErrorActionPreference = 'Stop'
$credential = Import-Clixml -Path '__CREDENTIAL_PATH__'
$env:MACHINE_ACTIVITY_DEVICE_TOKEN = $credential.GetNetworkCredential().Password
$env:MACHINE_ACTIVITY_ENDPOINT = '__ENDPOINT__'
& '__PYTHON__' '__COLLECTOR__'
'@
$runner = $runner.Replace('__CREDENTIAL_PATH__', $credentialPath.Replace("'", "''"))
$runner = $runner.Replace('__ENDPOINT__', $Endpoint.Replace("'", "''"))
$runner = $runner.Replace('__PYTHON__', $python.Replace("'", "''"))
$runner = $runner.Replace('__COLLECTOR__', $collector.Replace("'", "''"))
Set-Content -Path $runnerPath -Value $runner -Encoding UTF8

# Enable Hermes' content-free active-session lease registry. This is a bounded
# concurrency ceiling, not an additional permission or remote-control channel.
& $hermes config set max_concurrent_sessions 16 | Out-Null

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runnerPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

$credential = $null
$secureToken = $null
Write-Host "Installed scheduled task: $taskName"
Write-Host "Verify: Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo"

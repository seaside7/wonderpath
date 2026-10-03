<#
  One-time, manual registration of the qa-agent Windows Scheduled Task.
  Run this yourself after you've verified run.js works via the manual
  dry-run and single-fix steps in the approved plan - this is NOT run
  automatically by anything else.

  Usage: powershell -File qa-agent\scheduler\install-task.ps1
#>

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$runScript = Join-Path $repoRoot 'qa-agent\run.js'
$nodeExe = (Get-Command node).Source
$taskName = 'WonderPath-QA-Agent'

if (-not (Test-Path $runScript)) {
    throw "run.js not found at $runScript - are you running this from the repo?"
}

$action = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument "`"$runScript`" --dry-run=false" `
    -WorkingDirectory (Join-Path $repoRoot 'qa-agent')

$trigger = New-ScheduledTaskTrigger -Daily -At '07:00'
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At '07:00' `
    -RepetitionInterval (New-TimeSpan -Hours 3) `
    -RepetitionDuration (New-TimeSpan -Days 1)).Repetition

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -MultipleInstances IgnoreNew
$settings.WakeToRun = $false

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description 'WonderPath QA/self-improvement agent - runs qa-agent/run.js. See WonderPath_CLAUDE_CONTEXT.md Section 50 for guardrails.' `
    -Force

Write-Host "Registered scheduled task '$taskName' - daily at 07:00, repeating every 3 hours, only while logged in, never wakes the machine."
Write-Host "To remove it later: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"

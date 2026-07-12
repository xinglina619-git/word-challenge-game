$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
  Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory $root -WindowStyle Hidden
  Start-Sleep -Seconds 1
}

Start-Process 'http://localhost:3000'

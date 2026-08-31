$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = if ($env:WORD_SPIRIT_LAUNCH_PORT) { [int]$env:WORD_SPIRIT_LAUNCH_PORT } else { 31876 }
$healthUrl = "http://127.0.0.1:$port/api/health"
$appId = 'word-spirit-planet'
$appVersion = '0.4.0'
$timeoutMs = if ($env:WORD_SPIRIT_START_TIMEOUT_MS) { [int]$env:WORD_SPIRIT_START_TIMEOUT_MS } else { 8000 }
$outputDirectory = if ($env:WORD_SPIRIT_OUTPUT_DIR) { $env:WORD_SPIRIT_OUTPUT_DIR } else { Join-Path $root 'output' }
$serverScript = if ($env:WORD_SPIRIT_SERVER_SCRIPT) { $env:WORD_SPIRIT_SERVER_SCRIPT } else { Join-Path $root 'server.js' }

function ConvertFrom-WordSpiritText([string]$Value) {
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value))
}

function Stop-WordSpiritLaunch([string]$Code, [string]$Message) {
  [Console]::Error.WriteLine("$Code $Message")
  if ($env:WORD_SPIRIT_BROWSER_DISABLED -ne '1') {
    try {
      Add-Type -AssemblyName PresentationFramework
      $title = ConvertFrom-WordSpiritText '6K+N54G15pif55CD5ZCv5Yqo5aSx6LSl'
      [Windows.MessageBox]::Show($Message, $title, 'OK', 'Error') | Out-Null
    } catch {}
  }
  exit 1
}

function Test-WordSpiritHealth {
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1
    return $health.app -eq $appId -and $health.version -eq $appVersion -and $health.ok -eq $true
  } catch {
    return $false
  }
}

function Test-WordSpiritPort {
  $client = [Net.Sockets.TcpClient]::new()
  try {
    $connected = $client.ConnectAsync('127.0.0.1', $port)
    return $connected.Wait(300) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Start-WordSpiritNode([string]$NodePath, [string]$ScriptPath, [string]$StandardOutput, [string]$StandardError) {
  $pathEntries = @(
    [Environment]::GetEnvironmentVariables('Process').GetEnumerator() |
      Where-Object { $_.Key -ieq 'PATH' } |
      ForEach-Object { [pscustomobject]@{ Key = [string]$_.Key; Value = [string]$_.Value } }
  )
  $effectivePath = $env:Path
  if (-not $effectivePath -and $pathEntries.Count -gt 0) { $effectivePath = $pathEntries[0].Value }

  try {
    foreach ($entry in $pathEntries) {
      [Environment]::SetEnvironmentVariable($entry.Key, $null, 'Process')
    }
    [Environment]::SetEnvironmentVariable('Path', $effectivePath, 'Process')
    if ($pathEntries.Count -gt 1) { [Console]::Out.WriteLine('WORD_SPIRIT_PATH_NORMALIZED') }
    return Start-Process -FilePath $NodePath -ArgumentList @("`"$ScriptPath`"") -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $StandardOutput -RedirectStandardError $StandardError -PassThru
  } finally {
    $currentPathKeys = @(
      [Environment]::GetEnvironmentVariables('Process').Keys | Where-Object { $_ -ieq 'PATH' }
    )
    foreach ($key in $currentPathKeys) {
      [Environment]::SetEnvironmentVariable([string]$key, $null, 'Process')
    }
    foreach ($entry in $pathEntries) {
      [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }
  }
}

$nodePath = $env:WORD_SPIRIT_NODE_PATH
if (-not $nodePath) {
  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($nodeCommand) { $nodePath = $nodeCommand.Source }
}
if (-not $nodePath -or -not (Test-Path -LiteralPath $nodePath -PathType Leaf)) {
  $message = ConvertFrom-WordSpiritText '5pyq5om+5YiwIE5vZGUuanPvvIzml6Dms5XlkK/liqjjgIror43ngbXmmJ/nkIPjgIvjgILor7flhYjlronoo4UgTm9kZS5qc+OAgg=='
  Stop-WordSpiritLaunch 'WORD_SPIRIT_NODE_MISSING' $message
}

if (Test-WordSpiritHealth) {
  Write-Output 'WORD_SPIRIT_REUSED'
} else {
  if (Test-WordSpiritPort) {
    $template = ConvertFrom-WordSpiritText '56uv5Y+jIHswfSDlt7Looqvlhbbku5bmnI3liqHljaDnlKjvvIzkuJTlgaXlurfmo4Dmn6XkuI3ljLnphY3jgILkuLrkv53miqTnjrDmnInnqIvluo/vvIzlkK/liqjlmajkuI3kvJrnu5PmnZ/mnKrnn6Xov5vnqIvjgII='
    Stop-WordSpiritLaunch 'WORD_SPIRIT_PORT_CONFLICT' ($template -f $port)
  }
  if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
    $template = ConvertFrom-WordSpiritText '44CK6K+N54G15pif55CD44CL5pyN5Yqh5ZCv5Yqo5aSx6LSl44CC6K+35p+l55yL5pel5b+X77yaezB9'
    Stop-WordSpiritLaunch 'WORD_SPIRIT_SERVER_MISSING' ($template -f $outputDirectory)
  }

  [IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $stdoutLog = Join-Path $outputDirectory "server-$port-$stamp.out.log"
  $stderrLog = Join-Path $outputDirectory "server-$port-$stamp.err.log"
  $previousPort = $env:PORT
  $env:PORT = [string]$port
  try {
    $serverProcess = Start-WordSpiritNode $nodePath $serverScript $stdoutLog $stderrLog
  } finally {
    if ($null -eq $previousPort) { Remove-Item Env:PORT -ErrorAction SilentlyContinue } else { $env:PORT = $previousPort }
  }

  $timer = [Diagnostics.Stopwatch]::StartNew()
  $healthy = $false
  while ($timer.ElapsedMilliseconds -lt $timeoutMs) {
    if (Test-WordSpiritHealth) {
      $healthy = $true
      break
    }
    if ($serverProcess.HasExited) { break }
    Start-Sleep -Milliseconds 100
  }

  if (-not $healthy) {
    if (-not $serverProcess.HasExited) {
      Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
    $seconds = [Math]::Ceiling($timeoutMs / 1000)
    $template = ConvertFrom-WordSpiritText '44CK6K+N54G15pif55CD44CL5ZCv5Yqo6LaF5pe277yI5pyA5aSa562J5b6FIHswfSDnp5LvvInjgILor7fmn6XnnIvml6Xlv5fvvJp7MX0='
    [Console]::Error.WriteLine("LOG_DIR=$outputDirectory")
    Stop-WordSpiritLaunch 'WORD_SPIRIT_START_TIMEOUT' ($template -f $seconds, $outputDirectory)
  }
  Write-Output 'WORD_SPIRIT_STARTED'
  if ($env:WORD_SPIRIT_BROWSER_DISABLED -eq '1') {
    Write-Output "WORD_SPIRIT_STARTED_PID=$($serverProcess.Id)"
  }
}

if ($env:WORD_SPIRIT_BROWSER_DISABLED -eq '1') {
  Write-Output 'WORD_SPIRIT_BROWSER_SKIPPED'
} else {
  Start-Process "http://127.0.0.1:$port"
}

exit 0

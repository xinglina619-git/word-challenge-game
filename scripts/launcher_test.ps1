param([switch]$InvokeOnly)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$launcher = (Get-ChildItem -LiteralPath $root -Filter '*.ps1' -File | Select-Object -First 1).FullName
$fixture = Join-Path $root 'scripts\launcher_fixture_server.js'
$processHelper = Join-Path $root 'scripts\launcher_process_helper.js'
$testScript = $MyInvocation.MyCommand.Path
$powershellExe = (Get-Command powershell.exe -ErrorAction Stop).Source
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$temporaryRoots = [Collections.Generic.List[string]]::new()
$knownProcesses = [Collections.Generic.List[Diagnostics.Process]]::new()
$duplicatePathEnvironment = @([Environment]::GetEnvironmentVariables('Process').Keys | Where-Object { $_ -ieq 'PATH' }).Count -gt 1

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

function Assert-Contains([string]$Actual, [string]$Expected, [string]$Message) {
  if (-not $Actual.Contains($Expected)) { throw "$Message`nActual output: $Actual" }
}

function ConvertFrom-TestText([string]$Value) {
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value))
}

function Get-FreePort {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
  $listener.Start()
  try { return ([Net.IPEndPoint]$listener.LocalEndpoint).Port } finally { $listener.Stop() }
}

function New-TestRoot {
  $directory = Join-Path ([IO.Path]::GetTempPath()) ("word-spirit-launcher-{0}" -f [guid]::NewGuid().ToString('N'))
  [IO.Directory]::CreateDirectory($directory) | Out-Null
  $temporaryRoots.Add($directory)
  return $directory
}

function Start-Fixture([int]$Port, [string]$Mode) {
  $savedPort = $env:PORT
  $savedMode = $env:WORD_SPIRIT_FIXTURE_MODE
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $nodeExe
  $startInfo.Arguments = '"{0}"' -f $fixture
  $startInfo.WorkingDirectory = $root
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $env:PORT = [string]$Port
  $env:WORD_SPIRIT_FIXTURE_MODE = $Mode
  try {
    $process = [Diagnostics.Process]::Start($startInfo)
  } finally {
    if ($null -eq $savedPort) { Remove-Item Env:PORT -ErrorAction SilentlyContinue } else { $env:PORT = $savedPort }
    if ($null -eq $savedMode) { Remove-Item Env:WORD_SPIRIT_FIXTURE_MODE -ErrorAction SilentlyContinue } else { $env:WORD_SPIRIT_FIXTURE_MODE = $savedMode }
  }
  $knownProcesses.Add($process)
  return $process
}

function Wait-Health([int]$Port, [string]$ExpectedApp) {
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 1
      if ($health.app -eq $ExpectedApp) { return $health }
    } catch {}
    Start-Sleep -Milliseconds 100
  }
  throw "Fixture did not become ready on port $Port"
}

function Invoke-Launcher([hashtable]$Environment, [string]$Scenario) {
  $saved = @{}
  $captureRoot = New-TestRoot
  $stdoutFile = Join-Path $captureRoot 'launcher.out.log'
  $stderrFile = Join-Path $captureRoot 'launcher.err.log'
  try {
    foreach ($name in $Environment.Keys) {
      $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
      [Environment]::SetEnvironmentVariable($name, [string]$Environment[$name], 'Process')
    }
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $nodeExe
    $startInfo.Arguments = '"{0}" "{1}" "{2}" "{3}"' -f $processHelper, $testScript, $stdoutFile, $stderrFile
    $startInfo.WorkingDirectory = $root
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
    $process = [Diagnostics.Process]::Start($startInfo)
    $knownProcesses.Add($process)
    if (-not $process.WaitForExit(15000)) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      $process.WaitForExit(3000) | Out-Null
      $output = (Get-Content -Raw -Encoding UTF8 $stdoutFile -ErrorAction SilentlyContinue) + (Get-Content -Raw -Encoding UTF8 $stderrFile -ErrorAction SilentlyContinue)
      throw "Launcher subprocess '$Scenario' did not exit within 15 seconds`nCaptured output: $output"
    }
    $process.WaitForExit()
    $exitCode = $process.ExitCode
    $output = (Get-Content -Raw -Encoding UTF8 $stdoutFile -ErrorAction SilentlyContinue) + (Get-Content -Raw -Encoding UTF8 $stderrFile -ErrorAction SilentlyContinue)
    return [pscustomobject]@{ ExitCode = $exitCode; Output = $output }
  } finally {
    foreach ($name in $Environment.Keys) {
      [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process')
    }
  }
}

if ($InvokeOnly) {
  if ($env:WORD_SPIRIT_TEST_DUPLICATE_PATH -eq '1') {
    [Environment]::SetEnvironmentVariable('PATH', $env:Path, 'Process')
  }
  & $launcher
  exit $LASTEXITCODE
}

$launcherSource = Get-Content -Raw -Encoding UTF8 $launcher
Assert-Contains $launcherSource '31876' 'Launcher must use dedicated port 31876'
Assert-Contains $launcherSource '/api/health' 'Launcher must verify the health endpoint'
Assert-Contains $launcherSource 'WORD_SPIRIT_BROWSER_DISABLED' 'Launcher must allow tests to suppress the browser'

try {
  $commonRoot = New-TestRoot
  $common = @{
    WORD_SPIRIT_BROWSER_DISABLED = '1'
    WORD_SPIRIT_TEST_DUPLICATE_PATH = '1'
    WORD_SPIRIT_OUTPUT_DIR = (Join-Path $commonRoot 'output')
    WORD_SPIRIT_DATA_DIR = (Join-Path $commonRoot 'data')
  }

  $reusePort = Get-FreePort
  $reuseFixture = Start-Fixture $reusePort 'matching'
  Wait-Health $reusePort 'word-spirit-planet' | Out-Null
  $reuse = Invoke-Launcher ($common + @{ WORD_SPIRIT_LAUNCH_PORT = [string]$reusePort }) 'reuse'
  Assert-True ($reuse.ExitCode -eq 0) ("Matching health service should be reused; exit=$($reuse.ExitCode)`n" + $reuse.Output)
  Assert-Contains $reuse.Output 'WORD_SPIRIT_REUSED' 'Reuse marker is missing'
  Assert-True (-not $reuseFixture.HasExited) 'Launcher must not terminate a matching service'
  Stop-Process -Id $reuseFixture.Id -Force

  $startPort = Get-FreePort
  $started = Invoke-Launcher ($common + @{ WORD_SPIRIT_LAUNCH_PORT = [string]$startPort }) 'start'
  $startedPidMatch = [regex]::Match($started.Output, 'WORD_SPIRIT_STARTED_PID=(\d+)')
  if ($startedPidMatch.Success) {
    $startedProcess = Get-Process -Id ([int]$startedPidMatch.Groups[1].Value) -ErrorAction SilentlyContinue
    if ($startedProcess) { $knownProcesses.Add($startedProcess) }
  }
  Assert-True ($started.ExitCode -eq 0) ("An unused port should start Word Spirit Planet`n" + $started.Output)
  $health = Wait-Health $startPort 'word-spirit-planet'
  Assert-True ($health.version -eq '0.4.0' -and $health.ok -eq $true) 'Started health identity does not match'
  if ($duplicatePathEnvironment) {
    Assert-Contains $started.Output 'WORD_SPIRIT_PATH_NORMALIZED' 'Duplicate Path keys must be normalized before Start-Process'
  }
  Assert-Contains $started.Output 'WORD_SPIRIT_BROWSER_SKIPPED' 'Test mode must suppress the browser'
  Assert-True $startedPidMatch.Success 'Launcher must report its known child PID in test mode'
  Assert-True ([bool]$startedProcess) 'Launcher-reported child PID must still be running after health success'
  Stop-Process -Id $startedProcess.Id -Force
  $startedProcess.WaitForExit(3000) | Out-Null

  $mismatchPort = Get-FreePort
  $mismatchFixture = Start-Fixture $mismatchPort 'mismatch'
  Wait-Health $mismatchPort 'other-service' | Out-Null
  $mismatch = Invoke-Launcher ($common + @{ WORD_SPIRIT_LAUNCH_PORT = [string]$mismatchPort }) 'mismatch'
  Assert-True ($mismatch.ExitCode -ne 0) 'Mismatched occupied port must fail'
  Assert-Contains $mismatch.Output 'WORD_SPIRIT_PORT_CONFLICT' 'Port conflict marker is missing'
  Assert-Contains $mismatch.Output (ConvertFrom-TestText '5bey6KKr5YW25LuW5pyN5Yqh5Y2g55So') 'Port conflict must include a Chinese explanation'
  Assert-True (-not $mismatchFixture.HasExited) 'Launcher must not terminate an unknown service'
  Stop-Process -Id $mismatchFixture.Id -Force

  $missingNode = Invoke-Launcher ($common + @{
    WORD_SPIRIT_LAUNCH_PORT = [string](Get-FreePort)
    WORD_SPIRIT_NODE_PATH = (Join-Path $commonRoot 'missing-node.exe')
  }) 'missing-node'
  Assert-True ($missingNode.ExitCode -ne 0) 'Missing Node must fail'
  Assert-Contains $missingNode.Output 'WORD_SPIRIT_NODE_MISSING' 'Missing Node marker is missing'
  Assert-Contains $missingNode.Output (ConvertFrom-TestText '5pyq5om+5YiwIE5vZGUuanM=') 'Missing Node must include a Chinese explanation'

  $timeout = Invoke-Launcher ($common + @{
    WORD_SPIRIT_LAUNCH_PORT = [string](Get-FreePort)
    WORD_SPIRIT_NODE_PATH = $nodeExe
    WORD_SPIRIT_SERVER_SCRIPT = $fixture
    WORD_SPIRIT_FIXTURE_MODE = 'silent'
    WORD_SPIRIT_START_TIMEOUT_MS = '600'
  }) 'health-timeout'
  Assert-True ($timeout.ExitCode -ne 0) 'Health timeout must fail'
  Assert-Contains $timeout.Output 'WORD_SPIRIT_START_TIMEOUT' 'Startup timeout marker is missing'
  Assert-Contains $timeout.Output 'LOG_DIR=' 'Startup timeout must provide the log directory'
  Assert-Contains $timeout.Output (ConvertFrom-TestText '5ZCv5Yqo6LaF5pe2') 'Startup timeout must include a Chinese explanation'
  Assert-Contains $timeout.Output (ConvertFrom-TestText '5pel5b+X') 'Startup timeout must mention logs in Chinese'

  $package = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'package.json') | ConvertFrom-Json
  $index = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'index.html')
  $readme = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'README.md')
  Assert-True ($package.version -eq '0.3.0') 'Package version must be 0.3.0'
  Assert-Contains $package.scripts.test 'launcher_test.ps1' 'npm test must include the launcher test'
  Assert-Contains $index '/app.js?v=22' 'app.js cache version must be updated'
  Assert-Contains $index '/styles.css?v=23' 'styles.css cache version must be updated'
  Assert-Contains $index '/pet-system.js?v=2' 'pet-system.js cache version must be updated'
  Assert-Contains $index '/review-games.js?v=2' 'review-games.js cache version must be updated'
  Assert-Contains $readme (ConvertFrom-TestText '5ZCM5pe25Ye6546w6Iux5paH5LiO5Lit5paH') 'README must describe text-only mixed matching'
  Assert-True (-not $readme.Contains((ConvertFrom-TestText '5Lit5paHL+WbvueJhw=='))) 'README must not advertise match-three picture tiles'
  Assert-Contains $readme 'http://127.0.0.1:31876' 'README must document the dedicated desktop URL'
  Assert-Contains $readme (ConvertFrom-TestText '5rOo5YaM5oiQ5Yqf5ZCO6K+36L+U5Zue55m75b2V') 'README must explain that registration returns to login'

  $duplicatePathResult = if ($duplicatePathEnvironment) { 'PASS' } else { 'SKIP' }
  Write-Output "LAUNCHER=PASS reuse=PASS start=PASS mismatch=PASS node-missing=PASS timeout=PASS browser-disabled=PASS duplicate-path=$duplicatePathResult"
} finally {
  foreach ($process in $knownProcesses) {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
  }
  foreach ($directory in $temporaryRoots) {
    if ([IO.Directory]::Exists($directory)) {
      [IO.Directory]::Delete($directory, $true)
    }
  }
}

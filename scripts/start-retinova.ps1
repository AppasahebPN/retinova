# ============================================================
# RETINOVA - One-Command Full Pipeline Startup
# ============================================================
# Usage:  npm run start:retinova
#   or:   powershell -ExecutionPolicy Bypass -File scripts/start-retinova.ps1
#
# Startup Order:
#   [1/7] PostgreSQL connectivity check
#   [2/7] Port conflict detection (5000, 8000)
#   [3/7] Frontend dist check / build
#   [4/7] Start MATLAB/Python AI Bridge (:8000)
#   [5/7] AI health poll (MATLAB Engine + Swin V2 Tiny)
#   [6/7] Start Node/Express API (:5000)
#   [7/7] API health poll + open browser
#
# Ctrl+C stops Node + Python child processes. PostgreSQL is untouched.
# ============================================================

param(
    [switch]$Restart
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# -- Paths --
$SCRIPT_DIR     = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT   = Split-Path -Parent $SCRIPT_DIR

$MOBILE_APP_DIR = Join-Path $PROJECT_ROOT "mobile-app"
$MOBILE_DIST    = Join-Path $MOBILE_APP_DIR "dist"

$LOCAL_BACKEND  = Join-Path $PROJECT_ROOT "backend"
if (Test-Path $LOCAL_BACKEND) {
    $BACKEND_DIR = $LOCAL_BACKEND
} else {
    $BACKEND_DIR = "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend"
}
$BRIDGE_SCRIPT  = Join-Path $BACKEND_DIR "matlab_bridge.py"
$BACKEND_ENV    = Join-Path $BACKEND_DIR ".env"

$PYTHON_EXE     = if ($env:PYTHON_PATH -and (Test-Path $env:PYTHON_PATH)) {
    $env:PYTHON_PATH
} elseif (Test-Path "C:\Users\Appasaheb\AppData\Local\Programs\Python\Python313\python.exe") {
    "C:\Users\Appasaheb\AppData\Local\Programs\Python\Python313\python.exe"
} else {
    (Get-Command python -ErrorAction SilentlyContinue).Source
}

# -- Config --
$PG_HOST        = "127.0.0.1"
$PG_PORT        = 5432
$BRIDGE_HOST    = "127.0.0.1"
$BRIDGE_PORT    = 8000
$API_HOST       = "127.0.0.1"
$API_PORT       = 5000
$BRIDGE_TIMEOUT = 180   # seconds to wait for MATLAB + Swin V2
$API_TIMEOUT    = 30    # seconds to wait for Express health
$OPEN_BROWSER   = if ($env:RETINOVA_OPEN_BROWSER -eq "false") { $false } else { $true }

# -- Automatic restart if requested --
if ($Restart) {
    Write-Host "  [-Restart: Stopping existing RETINOVA services...]" -ForegroundColor Yellow
    $existingP5 = (Get-NetTCPConnection -LocalPort $API_PORT -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }).OwningProcess | Select-Object -Unique
    if ($existingP5) { Stop-Process -Id $existingP5 -Force -ErrorAction SilentlyContinue }
    $existingP8 = (Get-NetTCPConnection -LocalPort $BRIDGE_PORT -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }).OwningProcess | Select-Object -Unique
    if ($existingP8) { Stop-Process -Id $existingP8 -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

# -- Child process tracking --
$script:bridgeProcess = $null
$script:nodeProcess   = $null
$script:shouldCleanup = $true

function Write-Tag {
    param([string]$Tag, [string]$Message, [string]$Color = "White")
    Write-Host "  [$Tag] " -NoNewline -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Step, [string]$Label, [string]$Status, [string]$Color = "White")
    Write-Host "  [$Step] $Label " -NoNewline -ForegroundColor Cyan
    Write-Host $Status -ForegroundColor $Color
}

function Write-Banner {
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor DarkCyan
    Write-Host "   RETINOVA  -  Explainable AI for DR Screening" -ForegroundColor Cyan
    Write-Host "   One-Command Full Pipeline Startup" -ForegroundColor DarkCyan
    Write-Host "  ============================================================" -ForegroundColor DarkCyan
    Write-Host ""
}

function Write-FailBanner {
    param([string]$Reason)
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Red
    Write-Host "   RETINOVA STARTUP FAILED" -ForegroundColor Red
    Write-Host "   $Reason" -ForegroundColor Yellow
    Write-Host "  ============================================================" -ForegroundColor Red
    Write-Host ""
}

function Cleanup {
    if (-not $script:shouldCleanup) { return }
    $script:shouldCleanup = $false
    Write-Host ""
    Write-Tag "RETINOVA" "Shutting down..." "Yellow"

    if ($script:nodeProcess -and -not $script:nodeProcess.HasExited) {
        $npid = $script:nodeProcess.Id
        Write-Tag "API" "Stopping Express (PID $npid)..." "Yellow"
        try {
            taskkill /PID $npid /T /F 2>$null | Out-Null
        } catch {
            try { $script:nodeProcess.Kill() } catch {}
        }
        Write-Tag "API" "Express stopped." "Green"
    }

    if ($script:bridgeProcess -and -not $script:bridgeProcess.HasExited) {
        $bpid = $script:bridgeProcess.Id
        Write-Tag "AI" "Stopping MATLAB Bridge (PID $bpid)..." "Yellow"
        try {
            taskkill /PID $bpid /T /F 2>$null | Out-Null
        } catch {
            try { $script:bridgeProcess.Kill() } catch {}
        }
        Write-Tag "AI" "MATLAB Bridge stopped." "Green"
    }

    Write-Tag "DB" "PostgreSQL service left running (managed by Windows)." "DarkGray"
    Write-Tag "RETINOVA" "Shutdown complete." "Green"
    Write-Host ""
}

# Register exit handler
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } -ErrorAction SilentlyContinue
try { [Console]::TreatControlCAsInput = $false } catch {}

# Trap for script termination
trap {
    Cleanup
    break
}

# ============================================================
# STEP 1: PostgreSQL Connectivity Check
# ============================================================
Write-Banner

Write-Step "1/7" "PostgreSQL" "checking..." "Yellow"

try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connectTask = $tcpClient.ConnectAsync($PG_HOST, $PG_PORT)
    $connected = $connectTask.Wait(3000)
    $tcpClient.Close()
    if (-not $connected) {
        throw "Connection timed out"
    }
} catch {
    Write-Step "1/7" "PostgreSQL ............." "FAILED" "Red"
    Write-FailBanner "PostgreSQL is not available on ${PG_HOST}:${PG_PORT}. Ensure the PostgreSQL Windows service is running."
    exit 1
}

Write-Step "1/7" "PostgreSQL ............." "OK" "Green"

# ============================================================
# STEP 2: Port Conflict Detection
# ============================================================
# STEP 2: Port Conflict Detection & Smart Process Reuse
# ============================================================
Write-Step "2/7" "Port checks" "scanning..." "Yellow"

# Check port 5000 (Express API)
$port5000 = Get-NetTCPConnection -LocalPort $API_PORT -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
$reusingNode = $false
if ($port5000) {
    $pid5000 = $port5000[0].OwningProcess
    $proc5000 = Get-Process -Id $pid5000 -ErrorAction SilentlyContinue
    $procName5000 = if ($proc5000) { $proc5000.ProcessName } else { "PID $pid5000" }

    # Check if it's already the RETINOVA Express API
    try {
        $apiHealthResp = Invoke-RestMethod -Uri "http://${API_HOST}:${API_PORT}/api/health" -TimeoutSec 3 -ErrorAction Stop
        if ($apiHealthResp.status -eq "healthy" -or $apiHealthResp.backend_service -match "NetraAI|Express") {
            $reusingNode = $true
            $script:nodeProcess = $proc5000
            Write-Step "2/7" "Port $API_PORT (Express API)" "reusing existing (PID $pid5000)" "Green"
        } else {
            throw "Unknown service"
        }
    } catch {
        # If it's a node process that is unresponsive or stale, clean it up automatically
        if ($procName5000 -eq "node") {
            Write-Tag "API" "Port $API_PORT had stale/unresponsive node (PID $pid5000). Terminating..." "Yellow"
            try {
                Stop-Process -Id $pid5000 -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
                Write-Tag "API" "Port $API_PORT freed." "Green"
            } catch {
                Write-Step "2/7" "Port $API_PORT ................" "BLOCKED" "Red"
                Write-FailBanner "Port $API_PORT is in use by '$procName5000' (PID $pid5000) and could not be terminated."
                exit 1
            }
        } else {
            Write-Step "2/7" "Port $API_PORT ................" "BLOCKED" "Red"
            Write-FailBanner "Port $API_PORT is already in use by '$procName5000' (PID $pid5000). Stop that process first."
            exit 1
        }
    }
}

# Check port 8000 (MATLAB / Python AI Bridge)
$port8000 = Get-NetTCPConnection -LocalPort $BRIDGE_PORT -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
$reusingBridge = $false
if ($port8000) {
    $pid8000 = $port8000[0].OwningProcess
    $proc8000 = Get-Process -Id $pid8000 -ErrorAction SilentlyContinue
    $procName8000 = if ($proc8000) { $proc8000.ProcessName } else { "PID $pid8000" }

    # Check if it's already the RETINOVA bridge
    try {
        $healthResp = Invoke-RestMethod -Uri "http://${BRIDGE_HOST}:${BRIDGE_PORT}/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($healthResp.service -match "SIH26038|Career Crafters|DR Screening" -or $healthResp.status -eq "healthy") {
            $reusingBridge = $true
            $script:bridgeProcess = $proc8000
            Write-Step "2/7" "Port $BRIDGE_PORT (AI Bridge)" "reusing existing (PID $pid8000)" "Green"
        } else {
            throw "Unknown service"
        }
    } catch {
        if ($procName8000 -eq "python") {
            Write-Tag "AI" "Port $BRIDGE_PORT had stale/unresponsive python (PID $pid8000). Terminating..." "Yellow"
            try {
                Stop-Process -Id $pid8000 -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
                Write-Tag "AI" "Port $BRIDGE_PORT freed." "Green"
            } catch {
                Write-Step "2/7" "Port $BRIDGE_PORT ................" "BLOCKED" "Red"
                Write-FailBanner "Port $BRIDGE_PORT is in use by '$procName8000' (PID $pid8000) and could not be terminated."
                exit 1
            }
        } else {
            Write-Step "2/7" "Port $BRIDGE_PORT ................" "BLOCKED" "Red"
            Write-FailBanner "Port $BRIDGE_PORT is already in use by '$procName8000' (PID $pid8000). Not a RETINOVA AI Bridge."
            exit 1
        }
    }
}

if (-not $reusingNode -and -not $reusingBridge) {
    Write-Step "2/7" "Ports 5000, 8000 ......." "OK (available)" "Green"
}

# ============================================================
# STEP 3: Frontend Dist Check / Build
# ============================================================
Write-Step "3/7" "Frontend dist" "checking..." "Yellow"

$distIndex = Join-Path $MOBILE_DIST "index.html"
if (Test-Path $distIndex) {
    Write-Step "3/7" "Frontend dist .........." "OK (exists)" "Green"
} else {
    Write-Tag "WEB" "Production build not found. Building mobile-app for web..." "Yellow"
    try {
        Push-Location $MOBILE_APP_DIR
        # Ensure dependencies are installed
        if (-not (Test-Path (Join-Path $MOBILE_APP_DIR "node_modules"))) {
            Write-Tag "WEB" "Installing dependencies..." "Yellow"
            npm install 2>&1 | ForEach-Object { Write-Tag "WEB" "$_" "DarkGray" }
        }
        Write-Tag "WEB" "Running: npm run build" "Yellow"
        $buildOutput = npm run build 2>&1
        $buildOutput | ForEach-Object { Write-Tag "WEB" "$_" "DarkGray" }
        Pop-Location

        if (-not (Test-Path $distIndex)) {
            throw "Build completed but dist/index.html not found"
        }
        Write-Step "3/7" "Frontend dist .........." "OK (built)" "Green"
    } catch {
        Pop-Location -ErrorAction SilentlyContinue
        Write-Step "3/7" "Frontend dist .........." "FAILED" "Red"
        $buildErr = $_.Exception.Message
        Write-FailBanner "Could not build the frontend web app. Error: $buildErr"
        exit 1
    }
}

# ============================================================
# STEP 4: Start MATLAB/Python AI Bridge
# ============================================================
if (-not $reusingBridge) {
    Write-Step "4/7" "AI Bridge" "starting..." "Yellow"

    # Verify Python is available
    if (-not (Test-Path $PYTHON_EXE)) {
        Write-Step "4/7" "AI Bridge ............." "FAILED" "Red"
        Write-FailBanner "Python not found at: $PYTHON_EXE"
        exit 1
    }

    # Verify matlab_bridge.py exists
    if (-not (Test-Path $BRIDGE_SCRIPT)) {
        Write-Step "4/7" "AI Bridge ............." "FAILED" "Red"
        Write-FailBanner "matlab_bridge.py not found at: $BRIDGE_SCRIPT"
        exit 1
    }

    # Verify backend .env has AI_SERVICE_TYPE=matlab
    if (Test-Path $BACKEND_ENV) {
        $envContent = Get-Content $BACKEND_ENV -Raw
        if ($envContent -match "AI_SERVICE_TYPE\s*=\s*mock") {
            Write-Step "4/7" "AI Bridge ............." "BLOCKED" "Red"
            Write-FailBanner "backend/.env has AI_SERVICE_TYPE=mock. RETINOVA requires AI_SERVICE_TYPE=matlab."
            exit 1
        }
    }

    # Start the bridge
    $bridgeStartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $bridgeStartInfo.FileName = $PYTHON_EXE
    $bridgeStartInfo.Arguments = "`"$BRIDGE_SCRIPT`""
    $bridgeStartInfo.WorkingDirectory = $BACKEND_DIR
    $bridgeStartInfo.UseShellExecute = $false
    $bridgeStartInfo.RedirectStandardOutput = $true
    $bridgeStartInfo.RedirectStandardError = $true
    $bridgeStartInfo.EnvironmentVariables["PORT"] = "$BRIDGE_PORT"
    $bridgeStartInfo.CreateNoWindow = $true

    $script:bridgeProcess = New-Object System.Diagnostics.Process
    $script:bridgeProcess.StartInfo = $bridgeStartInfo

    # Async output capture
    $bridgeOutAction = {
        if ($EventArgs.Data) {
            $line = $EventArgs.Data
            if ($line -match "MATLAB") {
                Write-Host "  [MATLAB] $line" -ForegroundColor Magenta
            } elseif ($line -match "Swin|model|GPU|CUDA") {
                Write-Host "  [AI] $line" -ForegroundColor Blue
            } else {
                Write-Host "  [AI] $line" -ForegroundColor DarkGray
            }
        }
    }
    $bridgeErrAction = {
        if ($EventArgs.Data) {
            $line = $EventArgs.Data
            if ($line -match "error|Error|ERROR|Traceback|exception" -and $line -notmatch "INFO:|WARNING:") {
                Write-Host "  [AI] $line" -ForegroundColor Red
            } elseif ($line -match "Started server|Application startup|Uvicorn running") {
                Write-Host "  [AI] $line" -ForegroundColor Green
            } else {
                Write-Host "  [AI] $line" -ForegroundColor DarkGray
            }
        }
    }
    Register-ObjectEvent -InputObject $script:bridgeProcess -EventName OutputDataReceived -Action $bridgeOutAction | Out-Null
    Register-ObjectEvent -InputObject $script:bridgeProcess -EventName ErrorDataReceived -Action $bridgeErrAction | Out-Null

    try {
        $script:bridgeProcess.Start() | Out-Null
        $script:bridgeProcess.BeginOutputReadLine()
        $script:bridgeProcess.BeginErrorReadLine()
        $bpid2 = $script:bridgeProcess.Id
        Write-Tag "AI" "MATLAB Bridge started (PID $bpid2)" "Green"
    } catch {
        Write-Step "4/7" "AI Bridge ............." "FAILED" "Red"
        $startErr = $_.Exception.Message
        Write-FailBanner "Could not start matlab_bridge.py. Error: $startErr"
        Cleanup
        exit 1
    }

    # Brief pause to let Python import and begin
    Start-Sleep -Seconds 3

    if ($script:bridgeProcess.HasExited) {
        $exitCode = $script:bridgeProcess.ExitCode
        Write-Step "4/7" "AI Bridge ............." "CRASHED" "Red"
        Write-FailBanner "matlab_bridge.py exited immediately (code $exitCode). Check Python deps, MATLAB Engine, Swin model."
        exit 1
    }

    Write-Step "4/7" "AI Bridge ............." "OK (running)" "Green"
} else {
    Write-Step "4/7" "AI Bridge ............." "OK (reused)" "Green"
}

# ============================================================
# STEP 5: AI Health Poll (MATLAB Engine + Swin V2 Tiny)
# ============================================================
Write-Step "5/7" "AI readiness" "polling..." "Yellow"

$bridgeHealthUrl = "http://${BRIDGE_HOST}:${BRIDGE_PORT}/api/health"
$pollInterval = 5
$elapsed = 0
$matlabReady = $false
$modelsReady = $false

while ($elapsed -lt $BRIDGE_TIMEOUT) {
    try {
        $health = Invoke-RestMethod -Uri $bridgeHealthUrl -TimeoutSec 5 -ErrorAction Stop

        $matlabStatus = $health.matlab_engine
        $modelsStatus = $health.models_cached

        if ($matlabStatus -eq "connected") {
            if (-not $matlabReady) {
                Write-Tag "MATLAB" "MATLAB Engine .......... connected" "Green"
                $matlabReady = $true
            }
        } else {
            $msg = "MATLAB Engine .......... $matlabStatus ($elapsed`s / $BRIDGE_TIMEOUT`s)"
            Write-Tag "MATLAB" $msg "Yellow"
        }

        if ($modelsStatus -eq $true) {
            if (-not $modelsReady) {
                Write-Tag "AI" "Swin V2 Tiny ........... loaded" "Green"
                $modelsReady = $true
            }
        } elseif ($matlabReady) {
            $msg2 = "Swin V2 Tiny ........... loading ($elapsed`s / $BRIDGE_TIMEOUT`s)"
            Write-Tag "AI" $msg2 "Yellow"
        }

        if ($matlabReady -and $modelsReady) {
            break
        }
    } catch {
        if ($script:bridgeProcess -and $script:bridgeProcess.HasExited) {
            $exitCode2 = $script:bridgeProcess.ExitCode
            Write-Step "5/7" "AI readiness .........." "CRASHED" "Red"
            Write-FailBanner "MATLAB Bridge process died during startup (exit code $exitCode2)."
            exit 1
        }
        $msg3 = "Bridge not yet accepting requests ($elapsed`s / $BRIDGE_TIMEOUT`s)..."
        Write-Tag "AI" $msg3 "DarkGray"
    }

    Start-Sleep -Seconds $pollInterval
    $elapsed += $pollInterval
}

if (-not ($matlabReady -and $modelsReady)) {
    $matlabLabel = if ($matlabReady) { "OK" } else { "NOT READY" }
    $modelsLabel = if ($modelsReady) { "OK" } else { "NOT READY" }
    Write-Step "5/7" "AI readiness .........." "TIMEOUT" "Red"
    Write-FailBanner "AI Bridge did not become fully ready within $BRIDGE_TIMEOUT`s. MATLAB: $matlabLabel, Swin: $modelsLabel"
    Cleanup
    exit 1
}

Write-Step "5/7" "AI readiness .........." "OK" "Green"

# ============================================================
# STEP 6: Start Node/Express API
# ============================================================
if (-not $reusingNode) {
    Write-Step "6/7" "Express API" "starting..." "Yellow"

    # Verify backend dist exists (compiled TypeScript)
    $backendDistIndex = Join-Path $BACKEND_DIR "dist\index.js"
    if (-not (Test-Path $backendDistIndex)) {
        Write-Tag "API" "Backend not compiled. Running: npm run build" "Yellow"
        Push-Location $BACKEND_DIR
        npm run build 2>&1 | ForEach-Object { Write-Tag "API" "$_" "DarkGray" }
        Pop-Location
        if (-not (Test-Path $backendDistIndex)) {
            Write-Step "6/7" "Express API ..........." "FAILED" "Red"
            Write-FailBanner "Backend TypeScript compilation failed. dist/index.js not found."
            Cleanup
            exit 1
        }
    }

    # Start Node
    $nodeStartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $nodeStartInfo.FileName = "node"
    $nodeStartInfo.Arguments = "dist/index.js"
    $nodeStartInfo.WorkingDirectory = $BACKEND_DIR
    $nodeStartInfo.UseShellExecute = $false
    $nodeStartInfo.RedirectStandardOutput = $true
    $nodeStartInfo.RedirectStandardError = $true
    $nodeStartInfo.CreateNoWindow = $true

    # Set the RETINOVA_WEB_DIST environment variable so Express serves the frontend
    $nodeStartInfo.EnvironmentVariables["RETINOVA_WEB_DIST"] = $MOBILE_DIST

    # Set PORT
    $nodeStartInfo.EnvironmentVariables["PORT"] = "$API_PORT"

    # Note: ProcessStartInfo.EnvironmentVariables automatically inherits
    # the current process environment when UseShellExecute = $false.
    # Our RETINOVA_WEB_DIST and PORT overrides above take precedence.

    $script:nodeProcess = New-Object System.Diagnostics.Process
    $script:nodeProcess.StartInfo = $nodeStartInfo

    $nodeOutAction = {
        if ($EventArgs.Data) {
            Write-Host "  [API] $($EventArgs.Data)" -ForegroundColor DarkGray
        }
    }
    $nodeErrAction = {
        if ($EventArgs.Data) {
            $line = $EventArgs.Data
            if ($line -match "error|Error|ERROR" -and $line -notmatch "errorHandler") {
                Write-Host "  [API] $line" -ForegroundColor Red
            } else {
                Write-Host "  [API] $line" -ForegroundColor DarkGray
            }
        }
    }
    Register-ObjectEvent -InputObject $script:nodeProcess -EventName OutputDataReceived -Action $nodeOutAction | Out-Null
    Register-ObjectEvent -InputObject $script:nodeProcess -EventName ErrorDataReceived -Action $nodeErrAction | Out-Null

    try {
        $script:nodeProcess.Start() | Out-Null
        $script:nodeProcess.BeginOutputReadLine()
        $script:nodeProcess.BeginErrorReadLine()
        $npid2 = $script:nodeProcess.Id
        Write-Tag "API" "Express started (PID $npid2)" "Green"
    } catch {
        Write-Step "6/7" "Express API ..........." "FAILED" "Red"
        $nodeErr = $_.Exception.Message
        Write-FailBanner "Could not start Node/Express. Error: $nodeErr"
        Cleanup
        exit 1
    }

    Start-Sleep -Seconds 3

    if ($script:nodeProcess.HasExited) {
        $nodeExit = $script:nodeProcess.ExitCode
        Write-Step "6/7" "Express API ..........." "CRASHED" "Red"
        Write-FailBanner "Express exited immediately (code $nodeExit)."
        Cleanup
        exit 1
    }

    Write-Step "6/7" "Express API ..........." "OK (running)" "Green"
} else {
    Write-Step "6/7" "Express API ..........." "OK (reused)" "Green"
}

# ============================================================
# STEP 7: API Health Poll + Open Browser
# ============================================================
Write-Step "7/7" "API health" "polling..." "Yellow"

$apiHealthUrl = "http://${API_HOST}:${API_PORT}/api/health"
$apiElapsed = 0
$apiReady = $false

while ($apiElapsed -lt $API_TIMEOUT) {
    try {
        $apiHealth = Invoke-RestMethod -Uri $apiHealthUrl -TimeoutSec 5 -ErrorAction Stop
        if ($apiHealth.status -eq "healthy" -or $apiHealth.matlab_engine -eq "connected") {
            $apiReady = $true
            break
        }
        $msg4 = "Health: $($apiHealth.status) ($apiElapsed`s / $API_TIMEOUT`s)"
        Write-Tag "API" $msg4 "Yellow"
    } catch {
        if ($script:nodeProcess.HasExited) {
            $nodeExit2 = $script:nodeProcess.ExitCode
            Write-Step "7/7" "API health ............" "CRASHED" "Red"
            Write-FailBanner "Express died during health check (exit code $nodeExit2)."
            Cleanup
            exit 1
        }
        $msg5 = "Waiting for Express ($apiElapsed`s)..."
        Write-Tag "API" $msg5 "DarkGray"
    }
    Start-Sleep -Seconds 2
    $apiElapsed += 2
}

if (-not $apiReady) {
    Write-Step "7/7" "API health ............" "TIMEOUT" "Red"
    Write-FailBanner "/api/health did not return healthy within $API_TIMEOUT seconds."
    Cleanup
    exit 1
}

Write-Step "7/7" "API health ............" "OK" "Green"

# -- Final Status --
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "   RETINOVA READY" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  [DB]     PostgreSQL ............. ${PG_HOST}:${PG_PORT}" -ForegroundColor Green
Write-Host "  [AI]     MATLAB Bridge .......... ${BRIDGE_HOST}:${BRIDGE_PORT}" -ForegroundColor Green
Write-Host "  [MATLAB] MATLAB Engine .......... connected" -ForegroundColor Green
Write-Host "  [AI]     Swin V2 Tiny ........... loaded" -ForegroundColor Green
Write-Host "  [API]    Express API ............ ${API_HOST}:${API_PORT}" -ForegroundColor Green
Write-Host "  [WEB]    Frontend ............... served from mobile-app/dist" -ForegroundColor Green
Write-Host ""
Write-Host "  RETINOVA available at: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:${API_PORT}" -ForegroundColor Cyan
Write-Host ""

# Open browser
if ($OPEN_BROWSER) {
    Write-Tag "WEB" "Opening browser..." "Cyan"
    Start-Process "http://localhost:${API_PORT}"
}

Write-Host "  Press Ctrl+C to stop all RETINOVA services." -ForegroundColor DarkGray
Write-Host ""

# -- Keep alive --
# Block until a child process exits or user presses Ctrl+C
try {
    while ($true) {
        if ($script:nodeProcess.HasExited) {
            $nodeExitFinal = $script:nodeProcess.ExitCode
            Write-Tag "API" "Express exited unexpectedly (code $nodeExitFinal)" "Red"
            Cleanup
            exit 1
        }
        if ($script:bridgeProcess -and $script:bridgeProcess.HasExited) {
            $bridgeExitFinal = $script:bridgeProcess.ExitCode
            Write-Tag "AI" "MATLAB Bridge exited unexpectedly (code $bridgeExitFinal)" "Red"
            Cleanup
            exit 1
        }
        Start-Sleep -Seconds 5
    }
} finally {
    Cleanup
}

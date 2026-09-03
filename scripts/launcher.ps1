# ============================================================
#                  UniBite - One-Click Launcher
# ============================================================

$ErrorActionPreference = "Stop"

$ProjectDir = (Get-Item -LiteralPath "$PSScriptRoot\..").FullName
Set-Location -LiteralPath $ProjectDir

$ToolsDir = Join-Path $ProjectDir ".tools"
$NodeDir = Join-Path $ToolsDir "node"
$MariaDbDir = Join-Path $ToolsDir "mariadb"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "              UniBite - One-Click Launcher                  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure .tools directory exists
if (-not (Test-Path -LiteralPath $ToolsDir)) {
    New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null
}

# ------------------------------------------------------------
# 1. Detect or Download Node.js
# ------------------------------------------------------------
Write-Host "[1/5] Checking Node.js runtime..." -ForegroundColor Yellow

$NodeExe = $null
$NpmCmd = $null

# Check system PATH first
try {
    $sysNode = (Get-Command "node" -ErrorAction SilentlyContinue).Source
    if ($sysNode) {
        $NodeExe = $sysNode
        $NpmCmd = (Get-Command "npm" -ErrorAction SilentlyContinue).Source
    }
} catch {}

# Check portable directory
if (-not $NodeExe -and (Test-Path -LiteralPath "$NodeDir\node.exe")) {
    $NodeExe = "$NodeDir\node.exe"
    $NpmCmd = "$NodeDir\npm.cmd"
}

# Download portable Node.js if still not found
if (-not $NodeExe) {
    Write-Host "      Node.js not detected on this system." -ForegroundColor Gray
    Write-Host "      Downloading portable Node.js (~28MB)..." -ForegroundColor Yellow

    $nodeZip = Join-Path $ToolsDir "node.zip"
    $nodeUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"

    if (Get-Command "curl.exe" -ErrorAction SilentlyContinue) {
        & curl.exe -L -o "$nodeZip" "$nodeUrl"
    } else {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip
    }

    Write-Host "      Extracting Node.js..." -ForegroundColor Gray
    Expand-Archive -LiteralPath $nodeZip -DestinationPath $ToolsDir -Force
    Remove-Item -LiteralPath $nodeZip -Force -ErrorAction SilentlyContinue

    if (-not (Test-Path -LiteralPath $NodeDir)) {
        New-Item -ItemType Directory -Path $NodeDir -Force | Out-Null
    }

    $extractedDir = Join-Path $ToolsDir "node-v20.18.0-win-x64"
    Get-ChildItem -LiteralPath $extractedDir | Move-Item -Destination $NodeDir -Force
    Remove-Item -LiteralPath $extractedDir -Force -Recurse -ErrorAction SilentlyContinue

    $NodeExe = "$NodeDir\node.exe"
    $NpmCmd = "$NodeDir\npm.cmd"
}

# Update PATH for current process
if (Test-Path -LiteralPath $NodeDir) {
    $env:PATH = "$NodeDir;$env:PATH"
}

$nodeVer = & $NodeExe -v
Write-Host "  [OK] Node.js is ready ($nodeVer)" -ForegroundColor Green

# ------------------------------------------------------------
# 2. Check Node Dependencies (node_modules)
# ------------------------------------------------------------
Write-Host "[2/5] Checking dependencies (node_modules)..." -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath "$ProjectDir\node_modules")) {
    Write-Host "      Installing npm packages (first time only)..." -ForegroundColor Yellow
    & $NpmCmd install
    Write-Host "  [OK] Dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "  [OK] Dependencies already installed." -ForegroundColor Green
}

# ------------------------------------------------------------
# 3. Check / Start MySQL or MariaDB
# ------------------------------------------------------------
Write-Host "[3/5] Checking MySQL / MariaDB Server..." -ForegroundColor Yellow

function Test-Port3306 {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", 3306, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
    } catch {}
    return $false
}

$isPortOpen = Test-Port3306
$startedMariaDbProcess = $null

if ($isPortOpen) {
    Write-Host "  [OK] An existing MySQL/MariaDB server is already running on port 3306." -ForegroundColor Green
} else {
    Write-Host "      No MySQL server running on port 3306." -ForegroundColor Gray
    
    # Check if portable MariaDB exists
    $mysqldPath = "$MariaDbDir\bin\mysqld.exe"
    if (-not (Test-Path -LiteralPath $mysqldPath)) {
        Write-Host "      Downloading portable MariaDB Server (~85MB)..." -ForegroundColor Yellow
        $mariaZip = Join-Path $ToolsDir "mariadb.zip"
        $mariaUrl = "https://downloads.mariadb.com/MariaDB/mariadb-10.11.8/winx64-packages/mariadb-10.11.8-winx64.zip"

        if (Get-Command "curl.exe" -ErrorAction SilentlyContinue) {
            & curl.exe -L -o "$mariaZip" "$mariaUrl"
        } else {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $mariaUrl -OutFile $mariaZip
        }

        Write-Host "      Extracting MariaDB Server..." -ForegroundColor Gray
        Expand-Archive -LiteralPath $mariaZip -DestinationPath $ToolsDir -Force
        Remove-Item -LiteralPath $mariaZip -Force -ErrorAction SilentlyContinue

        if (-not (Test-Path -LiteralPath $MariaDbDir)) {
            New-Item -ItemType Directory -Path $MariaDbDir -Force | Out-Null
        }

        $extractedDir = Join-Path $ToolsDir "mariadb-10.11.8-winx64"
        Get-ChildItem -LiteralPath $extractedDir | Move-Item -Destination $MariaDbDir -Force
        Remove-Item -LiteralPath $extractedDir -Force -Recurse -ErrorAction SilentlyContinue
    }

    # Initialize data directory if necessary
    $dataPath = "$MariaDbDir\data"
    if (-not (Test-Path -LiteralPath "$dataPath\mysql")) {
        Write-Host "      Initializing MariaDB data directory..." -ForegroundColor Gray
        & "$MariaDbDir\bin\mysql_install_db.exe" --datadir="$dataPath" | Out-Null
    }

    Write-Host "      Starting portable MariaDB Server..." -ForegroundColor Gray
    $startedMariaDbProcess = Start-Process -FilePath "$MariaDbDir\bin\mysqld.exe" `
        -ArgumentList "--datadir=`"$dataPath`" --port=3306 --console" `
        -WindowStyle Minimized -PassThru

    # Wait for port 3306 to accept connections
    $retries = 15
    while (-not (Test-Port3306) -and $retries -gt 0) {
        Start-Sleep -Seconds 1
        $retries--
    }

    if (Test-Port3306) {
        Write-Host "  [OK] Portable MariaDB Server is running on port 3306." -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] MariaDB did not respond within 15 seconds. Continuing anyway..." -ForegroundColor DarkYellow
    }
}

# ------------------------------------------------------------
# 4. Initialize Database & Credentials (UNIBITES_DB)
# ------------------------------------------------------------
Write-Host "[4/5] Checking Database & Tables (UNIBITES_DB)..." -ForegroundColor Yellow

# Find mysql.exe CLI
$mysqlExe = $null
if (Test-Path -LiteralPath "$MariaDbDir\bin\mysql.exe") {
    $mysqlExe = "$MariaDbDir\bin\mysql.exe"
} elseif (Test-Path "C:\xampp\mysql\bin\mysql.exe") {
    $mysqlExe = "C:\xampp\mysql\bin\mysql.exe"
} else {
    try {
        $sysMysql = (Get-Command "mysql" -ErrorAction SilentlyContinue).Source
        if ($sysMysql) { $mysqlExe = $sysMysql }
    } catch {}
}

if ($mysqlExe) {
    # Check if we can connect with password '1422005'
    $canConnect1422005 = $false
    try {
        & $mysqlExe -u root -p1422005 -e "SELECT 1;" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $canConnect1422005 = $true }
    } catch {}

    # If not, check if root connects with empty password
    if (-not $canConnect1422005) {
        $canConnectEmpty = $false
        try {
            & $mysqlExe -u root -e "SELECT 1;" 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) { $canConnectEmpty = $true }
        } catch {}

        if ($canConnectEmpty) {
            Write-Host "      Configuring database user credentials..." -ForegroundColor Gray
            # Set password to 1422005 so db.js connects without code changes
            & $mysqlExe -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '1422005'; FLUSH PRIVILEGES;" 2>$null | Out-Null
            $canConnect1422005 = $true
        }
    }

    $passArg = if ($canConnect1422005) { "-p1422005" } else { "" }

    # Check if UNIBITES_DB exists
    $dbExists = $false
    try {
        & $mysqlExe -u root $passArg -e "USE UNIBITES_DB; SELECT count(*) FROM user;" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $dbExists = $true }
    } catch {}

    if (-not $dbExists) {
        Write-Host "      Importing UNIBITES_DB schema, procedures, triggers, and sample data..." -ForegroundColor Yellow

        # 1. tables.txt
        if (Test-Path -LiteralPath "$ProjectDir\db\tables.txt") {
            & $mysqlExe -u root $passArg -e "source $ProjectDir/db/tables.txt"
        }
        # 2. procedures.txt
        if (Test-Path -LiteralPath "$ProjectDir\db\procedures.txt") {
            & $mysqlExe -u root $passArg UNIBITES_DB -e "source $ProjectDir/db/procedures.txt"
        }
        # 3. triggers.txt
        if (Test-Path -LiteralPath "$ProjectDir\db\triggers.txt") {
            & $mysqlExe -u root $passArg UNIBITES_DB -e "source $ProjectDir/db/triggers.txt"
        }
        # 4. inserts.txt
        if (Test-Path -LiteralPath "$ProjectDir\db\data\inserts.txt") {
            & $mysqlExe -u root $passArg UNIBITES_DB -e "source $ProjectDir/db/data/inserts.txt"
        }

        Write-Host "  [OK] Database UNIBITES_DB imported successfully!" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Database UNIBITES_DB is already present." -ForegroundColor Green
    }
} else {
    Write-Host "  [NOTE] mysql.exe not found to check schema. If tables exist, server will run normally." -ForegroundColor Gray
}

# ------------------------------------------------------------
# 5. Launch UniBite Server & Browser
# ------------------------------------------------------------
Write-Host "[5/5] Starting UniBite Application..." -ForegroundColor Yellow

$serverProcess = Start-Process -FilePath $NodeExe -ArgumentList "server.js" `
    -WorkingDirectory $ProjectDir -PassThru

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "          UniBite is RUNNING at http://localhost:3000       " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Opening http://localhost:3000 in your browser..." -ForegroundColor Cyan

Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Leave this window open while using UniBite." -ForegroundColor Gray
Write-Host "Press [Enter] or close this window when you want to stop the server." -ForegroundColor Gray
Write-Host ""

[void][System.Console]::ReadLine()

Write-Host "Stopping UniBite server..." -ForegroundColor Yellow
if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}

if ($startedMariaDbProcess -and -not $startedMariaDbProcess.HasExited) {
    Write-Host "Stopping portable MariaDB..." -ForegroundColor Yellow
    Stop-Process -Id $startedMariaDbProcess.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "Done. Goodbye!" -ForegroundColor Green
Start-Sleep -Seconds 1

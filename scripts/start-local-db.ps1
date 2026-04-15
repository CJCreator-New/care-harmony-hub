#!/usr/bin/env pwsh
<#
.SYNOPSIS
Database Startup Script for Local Testing (Windows PowerShell)

.DESCRIPTION
Starts local database services for CareHarmony HIMS testing.
Supports PostgreSQL via Docker, Docker Compose, and Supabase.

.PARAMETER Mode
The startup mode: 'postgres', 'docker-compose', 'supabase', 'status', or 'stop'

.PARAMETER NoMigrations
Skip running database migrations

.PARAMETER NoSeedData
Skip loading test seed data

.PARAMETER Verbose
Show detailed output

.EXAMPLE
.\start-local-db.ps1 -Mode postgres
.\start-local-db.ps1 -Mode docker-compose -NoSeedData
.\start-local-db.ps1 -Mode status
.\start-local-db.ps1 -Mode stop

#>

param(
    [Parameter(Position = 0)]
    [ValidateSet('postgres', 'docker-compose', 'supabase', 'status', 'stop', 'help')]
    [string]$Mode = 'postgres',
    
    [switch]$NoMigrations,
    [switch]$NoSeedData,
    [switch]$ShowDetails
)

# === Configuration ===
$ErrorActionPreference = 'Stop'
$WarningPreference = 'Continue'

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logFile = Join-Path $projectRoot 'db-startup.log'
$envFile = Join-Path $projectRoot '.env.local'

# Environment variables (PowerShell 5.1 compatible)
if (-not $env:POSTGRES_HOST) { $env:POSTGRES_HOST = 'localhost' }
if (-not $env:POSTGRES_PORT) { $env:POSTGRES_PORT = '5432' }
if (-not $env:POSTGRES_USER) { $env:POSTGRES_USER = 'postgres' }
if (-not $env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD = 'postgres' }
if (-not $env:POSTGRES_DB) { $env:POSTGRES_DB = 'careharmony' }

# === Logging Functions ===
function Write-LogInfo {
    param([string]$Message)
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $output = "[$timestamp] [INFO] $Message"
    Write-Host $output -ForegroundColor Cyan
    Add-Content -Path $logFile -Value $output
}

function Write-LogSuccess {
    param([string]$Message)
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $output = "[$timestamp] [SUCCESS] $Message"
    Write-Host $output -ForegroundColor Green
    Add-Content -Path $logFile -Value $output
}

function Write-LogError {
    param([string]$Message)
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $output = "[$timestamp] [ERROR] $Message"
    Write-Host $output -ForegroundColor Red
    Add-Content -Path $logFile -Value $output
}

function Write-LogWarning {
    param([string]$Message)
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $output = "[$timestamp] [WARNING] $Message"
    Write-Host $output -ForegroundColor Yellow
    Add-Content -Path $logFile -Value $output
}

# === Helper Functions ===
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect('localhost', $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForService {
    param(
        [string]$Host,
        [int]$Port,
        [int]$TimeoutSeconds,
        [string]$ServiceName
    )
    
    Write-LogInfo "Waiting for $ServiceName to be ready (${Host}:${Port})..."
    
    $stopTime = (Get-Date).AddSeconds($TimeoutSeconds)
    
    while ((Get-Date) -lt $stopTime) {
        if (Test-Port $Port) {
            Write-LogSuccess "$ServiceName is ready!"
            return $true
        }
        Start-Sleep -Seconds 2
        Write-Host -NoNewline '.'
    }
    
    Write-LogError "$ServiceName failed to start within ${TimeoutSeconds}s"
    return $false
}

function Invoke-Docker {
    param([string[]]$Arguments)
    $cmd = @('docker') + $Arguments
    & $cmd
    return $LASTEXITCODE
}

function Test-DockerRunning {
    try {
        $null = docker ps 2>&1
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

# === Startup Functions ===
function Start-PostgresDocker {
    Write-LogInfo 'Starting PostgreSQL via Docker...'
    
    if (-not (Test-DockerRunning)) {
        Write-LogError 'Docker is not running'
        return $false
    }
    
    # Check if container exists
    $container = docker ps -a --format '{{.Names}}' 2>$null | Where-Object { $_ -eq 'careharmony-db' }
    
    if ($container) {
        Write-LogInfo "Container 'careharmony-db' found. Starting..."
        docker start careharmony-db 2>$null
    }
    else {
        Write-LogInfo 'Creating new PostgreSQL container...'
        $exitCode = Invoke-Docker @(
            'run', '-d',
            '--name', 'careharmony-db',
            '-e', "POSTGRES_USER=$($env:POSTGRES_USER)",
            '-e', "POSTGRES_PASSWORD=$($env:POSTGRES_PASSWORD)",
            '-e', "POSTGRES_DB=$($env:POSTGRES_DB)",
            '-p', "$($env:POSTGRES_PORT):5432",
            '-v', 'careharmony-postgres-data:/var/lib/postgresql/data',
            '--health-cmd', "pg_isready -U $($env:POSTGRES_USER)",
            '--health-interval', '10s',
            '--health-timeout', '5s',
            '--health-retries', '5',
            'postgres:15-alpine'
        )
        
        if ($exitCode -ne 0) {
            Write-LogError 'Failed to create container'
            return $false
        }
    }
    
    if (Wait-ForService 'localhost' $env:POSTGRES_PORT 30 'PostgreSQL') {
        Write-LogSuccess "PostgreSQL started on port $($env:POSTGRES_PORT)"
        return $true
    }
    
    return $false
}

function Start-DockerCompose {
    Write-LogInfo 'Starting services via docker-compose...'
    
    $composeFile = Join-Path $projectRoot 'docker-compose.yml'
    if (-not (Test-Path $composeFile)) {
        Write-LogError "docker-compose.yml not found at $projectRoot"
        return $false
    }
    
    Push-Location $projectRoot
    try {
        $exitCode = Invoke-Docker @('compose', 'up', '-d')
        if ($exitCode -ne 0) {
            Write-LogError 'docker-compose up failed'
            return $false
        }
    }
    finally {
        Pop-Location
    }
    
    if (Wait-ForService 'localhost' $env:POSTGRES_PORT 30 'PostgreSQL') {
        Write-LogSuccess 'docker-compose services started'
        return $true
    }
    
    return $false
}

function Start-SupabaseLocal {
    Write-LogInfo 'Starting Supabase local development environment...'
    
    $supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
    if (-not $supabaseCmd) {
        Write-LogError 'Supabase CLI not found. Install with: npm install -g supabase'
        return $false
    }
    
    Push-Location $projectRoot
    try {
        supabase start
        if ($LASTEXITCODE -ne 0) {
            Write-LogError 'supabase start failed'
            return $false
        }
    }
    finally {
        Pop-Location
    }
    
    Write-LogSuccess 'Supabase local environment started'
    
    # Show connection info
    Write-LogInfo 'Supabase connection info:'
    supabase status --output json 2>$null | Write-Host
    
    return $true
}

function Load-SeedData {
    Write-LogInfo 'Loading seed data...'
    
    $seedScript = Join-Path $projectRoot 'scripts' 'seed-test-data.sql'
    if (-not (Test-Path $seedScript)) {
        Write-LogWarning "Seed script not found at $seedScript"
        return $true
    }
    
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        Write-LogWarning "psql not found. Skipping seed data load. Install PostgreSQL client tools."
        return $true
    }
    
    $env:PGPASSWORD = $env:POSTGRES_PASSWORD
    
    try {
        psql -h $env:POSTGRES_HOST `
            -p $env:POSTGRES_PORT `
            -U $env:POSTGRES_USER `
            -d $env:POSTGRES_DB `
            -f $seedScript
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess 'Seed data loaded'
            return $true
        }
        else {
            Write-LogError 'Failed to load seed data'
            return $false
        }
    }
    finally {
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Invoke-Migrations {
    Write-LogInfo 'Running database migrations...'
    
    Push-Location $projectRoot
    try {
        $migrationDir = Join-Path $projectRoot 'supabase' 'migrations'
        if (Test-Path $migrationDir) {
            Write-LogInfo 'Found Supabase migrations'
            Write-LogSuccess 'Migrations handled by Supabase CLI'
            return $true
        }
        
        # Check for npm script
        $package = Get-Content 'package.json' -Raw | ConvertFrom-Json
        if ($package.scripts.migrate) {
            Write-LogInfo 'Running npm migrate script...'
            npm run migrate
            if ($LASTEXITCODE -eq 0) {
                Write-LogSuccess 'Migrations completed'
                return $true
            }
            else {
                Write-LogError 'Migration failed'
                return $false
            }
        }
        
        Write-LogWarning 'No migrations found or migrate script not defined'
        return $true
    }
    finally {
        Pop-Location
    }
}

function Verify-Connection {
    Write-LogInfo 'Verifying database connection...'
    
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        Write-LogWarning 'psql not found. Skipping connection verification.'
        return $true
    }
    
    $env:PGPASSWORD = $env:POSTGRES_PASSWORD
    
    try {
        $output = psql -h $env:POSTGRES_HOST `
            -p $env:POSTGRES_PORT `
            -U $env:POSTGRES_USER `
            -d $env:POSTGRES_DB `
            -c 'SELECT version();' 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess 'Database connection verified'
            return $true
        }
        else {
            Write-LogError 'Database connection failed'
            Write-Host "Details: $output"
            return $false
        }
    }
    finally {
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Show-Status {
    Write-LogInfo 'Checking database status...'
    
    # Check Docker
    if (Test-DockerRunning) {
        Write-LogSuccess 'Docker daemon is running'
        
        $container = docker ps --format '{{.Names}}' 2>$null | Where-Object { $_ -eq 'careharmony-db' }
        if ($container) {
            Write-LogSuccess 'PostgreSQL container is running'
            
            if (Test-Port $env:POSTGRES_PORT) {
                Write-LogSuccess "PostgreSQL is listening on localhost:$($env:POSTGRES_PORT)"
            }
        }
        else {
            Write-LogWarning 'PostgreSQL container is not running'
        }
    }
    else {
        Write-LogWarning 'Docker daemon is not running'
    }
    
    # Try to verify connection
    $null = Verify-Connection
}

function Stop-Services {
    Write-LogInfo 'Stopping services...'
    
    if (Test-DockerRunning) {
        $container = docker ps --format '{{.Names}}' 2>$null | Where-Object { $_ -eq 'carechrony-db' }
        if ($container) {
            Write-LogInfo 'Stopping PostgreSQL container...'
            docker stop careharmony-db 2>$null
            Write-LogSuccess 'PostgreSQL container stopped'
        }
    }
}

function Show-Help {
    $help = @"
CareHarmony HIMS - Database Startup Script

USAGE:
    .\start-local-db.ps1 [MODE] [OPTIONS]

MODES:
    postgres         Start PostgreSQL in Docker (default)
    docker-compose   Start all services via docker-compose
    supabase         Start Supabase local dev environment
    status           Check current database status
    stop             Stop database services
    help             Show this help message

OPTIONS:
    -NoMigrations    Skip running database migrations
    -NoSeedData      Skip loading test seed data
    -Verbose         Show detailed output

EXAMPLES:
    .\start-local-db.ps1
    .\start-local-db.ps1 -Mode docker-compose
    .\start-local-db.ps1 -Mode status
    .\start-local-db.ps1 -NoSeedData -Verbose

ENVIRONMENT VARIABLES:
    POSTGRES_HOST       Default: localhost
    POSTGRES_PORT       Default: 5432
    POSTGRES_USER       Default: postgres
    POSTGRES_PASSWORD   Default: postgres
    POSTGRES_DB         Default: careharmony

LOG FILE:
    $logFile
"@
    Write-Host $help
}

# === Main Execution ===
function Main {
    # Clear log file
    '' | Set-Content -Path $logFile
    
    Write-LogInfo '========================================='
    Write-LogInfo 'CareHarmony HIMS - Database Startup'
    Write-LogInfo "Mode: $Mode"
    Write-LogInfo "Project Root: $projectRoot"
    Write-LogInfo '========================================='
    
    $success = $false
    
    switch ($Mode) {
        'postgres' {
            $success = Start-PostgresDocker
            if ($success -and -not $NoMigrations) {
                $null = Invoke-Migrations
            }
            if ($success -and -not $NoSeedData) {
                $null = Load-SeedData
            }
            if ($success) {
                $null = Verify-Connection
            }
        }
        
        'docker-compose' {
            $success = Start-DockerCompose
            if ($success -and -not $NoMigrations) {
                $null = Invoke-Migrations
            }
            if ($success -and -not $NoSeedData) {
                $null = Load-SeedData
            }
            if ($success) {
                $null = Verify-Connection
            }
        }
        
        'supabase' {
            $success = Start-SupabaseLocal
        }
        
        'status' {
            Show-Status
            $success = $true
        }
        
        'stop' {
            Stop-Services
            $success = $true
        }
        
        'help' {
            Show-Help
            $success = $true
        }
        
        default {
            Write-LogError "Unknown mode: $Mode"
            Show-Help
            $success = $false
        }
    }
    
    if ($success) {
        Write-LogSuccess '========================================='
        Write-LogSuccess 'Database setup complete!'
        Write-LogInfo '========================================='
        Write-Host "`nYou can now run tests:`n"
        Write-Host "  npm run test:performance:backend"
        Write-Host "  npm run test:integration"
        Write-Host "  npm run test:unit`n"
        return 0
    }
    else {
        Write-LogError '========================================='
        Write-LogError 'Database setup failed!'
        Write-LogError '========================================='
        return 1
    }
}

# Run main
exit (Main)

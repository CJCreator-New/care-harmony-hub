# AroCord-HIMS: Interactive Secrets Scrubbing & Key Rotation Wizard (SEC-007)
# Generated following the /wizard skill specifications
# Run in PowerShell 7+ or Windows PowerShell

[CmdletBinding()]
param(
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

function Show-Header {
    param([string]$Title, [int]$CurrentStage, [int]$TotalStages)
    Clear-Host
    Write-Host "`n======================================================================" -ForegroundColor Cyan
    Write-Host " CareSync HIMS Wizard: $Title" -ForegroundColor Yellow
    Write-Host " Stage $CurrentStage of $TotalStages" -ForegroundColor DarkGray
    Write-Host "======================================================================`n" -ForegroundColor Cyan
}

function Confirm-Step {
    param([string]$Prompt)
    Write-Host ""
    $response = Read-Host "$Prompt (y/N)"
    if ($response -notmatch '^[Yy]$') {
        Write-Host "`nAction cancelled by user. Exiting wizard." -ForegroundColor Red
        exit 1
    }
}

function Pause-Step {
    param([string]$Prompt = "Press Enter to proceed to next step...")
    Write-Host ""
    Read-Host "$Prompt" | Out-Null
}

$TOTAL_STAGES = 6

# ==============================================================================
# STAGE 1: Repository Safety & Backup
# ==============================================================================
Show-Header -Title "Repository Safety & Pre-Scrub Backup" -CurrentStage 1 -TotalStages $TOTAL_STAGES

Write-Host "Before rewriting git history, we must verify working tree status and create a safe backup branch." -ForegroundColor White
Write-Host ""

$status = git status --porcelain
if ($status) {
    Write-Host "WARNING: Uncommitted changes detected in working tree!" -ForegroundColor Yellow
    $status | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    Confirm-Step -Prompt "Do you want to proceed despite uncommitted changes?"
}

$backupBranch = "backup-pre-secrets-purge-" + (Get-Date -Format "yyyyMMdd-HHmmss")
Write-Host "Creating local backup branch: $backupBranch" -ForegroundColor Green
git branch $backupBranch
Write-Host "Backup branch successfully created: $backupBranch" -ForegroundColor Green

Pause-Step

# ==============================================================================
# STAGE 2: Historical Git Commit History Scrub
# ==============================================================================
Show-Header -Title "Git History Secret Scrubbing (git-filter-repo)" -CurrentStage 2 -TotalStages $TOTAL_STAGES

Write-Host "Checking for tracked .env files in git revision history..." -ForegroundColor White
$trackedEnv = git log --all --full-history --oneline -- "**.env*"

if ($trackedEnv) {
    Write-Host "Historical commits containing .env files were found:" -ForegroundColor Red
    $trackedEnv | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    Write-Host ""
    Write-Host "This operation will rewrite commit SHAs using git-filter-repo to purge all historical .env files." -ForegroundColor Yellow
    Confirm-Step -Prompt "Ready to execute 'git filter-repo --invert-paths --path-glob *.env* --force'?"
    
    try {
        git filter-repo --invert-paths --path-glob "*.env*" --force
        Write-Host "`nGit history rewritten successfully. Tracked .env files removed." -ForegroundColor Green
    } catch {
        Write-Host "`nFailed to execute git-filter-repo. Ensure python and git-filter-repo are installed." -ForegroundColor Red
        Write-Host "Install via: pip install git-filter-repo" -ForegroundColor Yellow
        Confirm-Step -Prompt "Continue wizard to credential rotation anyway?"
    }
} else {
    Write-Host "Clean: No historical .env commits detected in git history." -ForegroundColor Green
}

Pause-Step

# ==============================================================================
# STAGE 3: Supabase Credential Rotation
# ==============================================================================
Show-Header -Title "Supabase API & Database Credential Rotation" -CurrentStage 3 -TotalStages $TOTAL_STAGES

Write-Host "Because historical keys were exposed, all live credentials must be rotated in the Supabase Dashboard." -ForegroundColor White
Write-Host ""
Write-Host "Opening Supabase Dashboard..." -ForegroundColor Cyan

$supabaseUrl = "https://supabase.com/dashboard/project/_/settings/api"
Start-Process $supabaseUrl -ErrorAction SilentlyContinue

Write-Host "Please perform the following actions in your browser:" -ForegroundColor Yellow
Write-Host "  1. Navigate to: Project Settings -> API" -ForegroundColor White
Write-Host "  2. Under 'JWT Settings', click 'Rotate Secret' (invalidates old tokens & anon keys)" -ForegroundColor White
Write-Host "  3. Copy your NEW 'Project URL', 'anon public key', and 'service_role secret'" -ForegroundColor White
Write-Host "  4. Navigate to: Project Settings -> Database -> Reset Database Password" -ForegroundColor White
Write-Host ""

Confirm-Step -Prompt "Have you completed credential rotation in the Supabase dashboard?"

Pause-Step

# ==============================================================================
# STAGE 4: Supabase Leaked Password Protection (HIBP)
# ==============================================================================
Show-Header -Title "Enable Leaked Password Protection (Tier 1 Item 1.1)" -CurrentStage 4 -TotalStages $TOTAL_STAGES

Write-Host "Opening Supabase Auth Security Settings..." -ForegroundColor Cyan
$authSettingsUrl = "https://supabase.com/dashboard/project/_/settings/auth"
Start-Process $authSettingsUrl -ErrorAction SilentlyContinue

Write-Host "Please perform the following compliance step:" -ForegroundColor Yellow
Write-Host "  1. Navigate to: Authentication -> Security / Attack Protection" -ForegroundColor White
Write-Host "  2. Toggle ON: 'Password Leak Detection' / 'HIBP (HaveIBeenPwned)'" -ForegroundColor White
Write-Host "  3. Click 'Save changes'" -ForegroundColor White
Write-Host ""

Confirm-Step -Prompt "Have you enabled password leak detection in Supabase Auth?"

Pause-Step

# ==============================================================================
# STAGE 5: Local & CI Secrets Deployment
# ==============================================================================
Show-Header -Title "Update Environment Configuration" -CurrentStage 5 -TotalStages $TOTAL_STAGES

Write-Host "Enter the rotated credentials to safely update local $EnvFile (inputs are masked):" -ForegroundColor White
Write-Host ""

$newUrl = Read-Host "Enter VITE_SUPABASE_URL (e.g. https://xyz.supabase.co)"
$newAnonKey = Read-Host "Enter VITE_SUPABASE_ANON_KEY / PUBLISHABLE_KEY" -MaskInput
$newServiceKey = Read-Host "Enter SUPABASE_SERVICE_ROLE_KEY" -MaskInput

if ($newUrl -and $newAnonKey) {
    if (Test-Path $EnvFile) {
        $envContent = Get-Content $EnvFile -Raw
        $envContent = $envContent -replace 'VITE_SUPABASE_URL=.*', "VITE_SUPABASE_URL=$newUrl"
        $envContent = $envContent -replace 'VITE_SUPABASE_ANON_KEY=.*', "VITE_SUPABASE_ANON_KEY=$newAnonKey"
        $envContent = $envContent -replace 'VITE_SUPABASE_PUBLISHABLE_KEY=.*', "VITE_SUPABASE_PUBLISHABLE_KEY=$newAnonKey"
        if ($newServiceKey) {
            $envContent = $envContent -replace 'SUPABASE_SERVICE_ROLE_KEY=.*', "SUPABASE_SERVICE_ROLE_KEY=$newServiceKey"
        }
        Set-Content -Path $EnvFile -Value $envContent
        Write-Host "`nUpdated $EnvFile with new credentials." -ForegroundColor Green
    } else {
        Write-Host "File $EnvFile not found; please create it manually from .env.example." -ForegroundColor Yellow
    }
}

# Update GitHub Secrets if gh CLI is present
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "`nGitHub CLI (gh) detected. Would you like to sync new secrets to GitHub Actions?" -ForegroundColor Cyan
    $syncGh = Read-Host "Sync secrets to GitHub repo? (y/N)"
    if ($syncGh -match '^[Yy]$' -and $newServiceKey) {
        $newServiceKey | gh secret set SUPABASE_SERVICE_ROLE_KEY
        $newAnonKey | gh secret set VITE_SUPABASE_ANON_KEY
        $newUrl | gh secret set VITE_SUPABASE_URL
        Write-Host "GitHub Secrets updated successfully." -ForegroundColor Green
    }
} else {
    Write-Host "`nNote: Update GitHub Secrets (SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL) manually in repo Settings -> Secrets." -ForegroundColor DarkGray
}

Pause-Step

# ==============================================================================
# STAGE 6: Verification & Hand-off
# ==============================================================================
Show-Header -Title "Audit Verification & Completion" -CurrentStage 6 -TotalStages $TOTAL_STAGES

Write-Host "Running post-remediation verification checks..." -ForegroundColor White
Write-Host ""

$checkLogs = git log --all --full-history --oneline -- "**.env*"
if (-not $checkLogs) {
    Write-Host "[PASS] Git revision history is completely free of tracked .env files." -ForegroundColor Green
} else {
    Write-Host "[WARN] Historical commits still detected:" -ForegroundColor Yellow
    $checkLogs | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
}

Write-Host "`nNext Verification Commands to Run:" -ForegroundColor Cyan
Write-Host "  1. npm run test:security       (Validate auth & RLS security gates)" -ForegroundColor White
Write-Host "  2. npm run validate:rls        (Validate Supabase database RLS policies)" -ForegroundColor White
Write-Host "  3. git push --force --all      (Force push rewritten history to remote if ready)" -ForegroundColor White

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host " SEC-007 Wizard Complete! Audit Ticket #18 is Ready to Resolve." -ForegroundColor Green
Write-Host "======================================================================`n" -ForegroundColor Cyan

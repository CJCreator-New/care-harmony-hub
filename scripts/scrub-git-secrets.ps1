# AroCord-HIMS: Historical Git Secret Scrubbing & Key Rotation Procedure (SEC-007)
# Run from repository root in PowerShell 7+

Write-Host "=== SEC-007: Historical Secret Scrubbing & Key Rotation ===" -ForegroundColor Cyan

Write-Host "`nStep 1: Checking git commit tree for tracked .env files..." -ForegroundColor Yellow
$trackedEnv = git log --all --full-history --oneline -- "**.env*"
if ($trackedEnv) {
    Write-Host "Found historical commits tracking .env files:" -ForegroundColor Red
    $trackedEnv | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    Write-Host "`nTo purge historical .env files across all branches and tags, run:" -ForegroundColor Yellow
    Write-Host "  git filter-repo --invert-paths --path-glob '*.env*' --force" -ForegroundColor White
    Write-Host "NOTE: git-filter-repo rewrites commit SHA hashes and requires force-push to remotes." -ForegroundColor Yellow
} else {
    Write-Host "No .env files detected in git history." -ForegroundColor Green
}

Write-Host "`nStep 2: Supabase Dashboard Key Rotation Checklist:" -ForegroundColor Yellow
Write-Host "  [ ] 1. Navigate to Supabase Dashboard -> Project Settings -> API" -ForegroundColor White
Write-Host "  [ ] 2. Click 'Rotate Secret' under JWT Secret (invalidates all existing user tokens & anon keys)" -ForegroundColor White
Write-Host "  [ ] 3. Generate new anon public key and service_role secret" -ForegroundColor White
Write-Host "  [ ] 4. Navigate to Project Settings -> Database -> Database Password and Reset Password" -ForegroundColor White
Write-Host "  [ ] 5. Rotate webhook signing secrets and storage bucket credentials" -ForegroundColor White

Write-Host "`nStep 3: Environment Configuration Deployment:" -ForegroundColor Yellow
Write-Host "  [ ] 1. Update Vercel / Hosting Provider environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY" -ForegroundColor White
Write-Host "  [ ] 2. Update GitHub Secrets: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_PASSWORD" -ForegroundColor White
Write-Host "  [ ] 3. Update local .env on developer machines" -ForegroundColor White

Write-Host "`nStep 4: Audit Verification:" -ForegroundColor Yellow
Write-Host "  Run: gitleaks detect --source . --verbose" -ForegroundColor White
Write-Host "  Run: npm run test:security" -ForegroundColor White

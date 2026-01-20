# Batch fix log injection vulnerabilities
# Adds sanitizeForLog import and wraps console.error/log statements

$files = @(
    "src\hooks\usePatients.ts",
    "src\hooks\usePrescriptions.ts",
    "src\hooks\usePharmacy.ts",
    "src\hooks\useLaboratory.ts",
    "src\hooks\useNotifications.ts",
    "src\hooks\useTelemedicine.ts",
    "src\hooks\useVoiceTranscription.ts"
)

foreach ($file in $files) {
    $content = Get-Content $file -Raw
    
    # Check if already has sanitizeForLog import
    if ($content -notmatch "sanitizeForLog") {
        # Add import after first import statement
        $content = $content -replace "(import .+ from .+;)", "`$1`nimport { sanitizeForLog } from '@/utils/sanitize';"
        
        # Wrap console.error with sanitizeForLog
        $content = $content -replace "console\.error\(([^,]+),\s*error", "console.error(`$1, sanitizeForLog(String(error)))"
        $content = $content -replace "console\.error\('([^']+)',\s*error", "console.error('`$1', sanitizeForLog(String(error)))"
        $content = $content -replace 'console\.error\("([^"]+)",\s*error', 'console.error("`$1", sanitizeForLog(String(error)))'
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "Fixed: $file"
    } else {
        Write-Host "Skipped (already fixed): $file"
    }
}

Write-Host "`nBatch fix complete!"

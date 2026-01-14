# PowerShell script to fix all log injection issues

$files = @(
    "src\hooks\useOptimisticMutation.ts",
    "src\hooks\useRefillRequests.ts",
    "src\hooks\useSecureMessaging.ts",
    "src\hooks\useTaskAssignments.ts",
    "src\hooks\useTriageAssessments.ts",
    "src\hooks\useVitalSigns.ts",
    "src\hooks\useVoiceTranscription.ts",
    "src\hooks\useWorkflowNotifications.ts",
    "src\components\integration\InterRoleCommunicationHub.tsx",
    "src\components\workflow\TaskAssignmentSystem.tsx",
    "src\contexts\AuthContext.tsx",
    "src\lib\sentry.ts",
    "src\pages\LoginPage.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "Processing $file..."
        
        $content = Get-Content $fullPath -Raw
        
        # Add import if not present
        if ($content -notmatch "sanitizeLogMessage") {
            $content = $content -replace "(import.*from.*;\r?\n)", "`$1import { sanitizeLogMessage } from '@/utils/sanitize';`r`n"
        }
        
        # Fix console.error patterns
        $content = $content -replace "console\.error\(([^,]+),\s*error\s*\)", "console.error(`$1, sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'))"
        $content = $content -replace "console\.error\(([^,]+),\s*err\s*\)", "console.error(`$1, sanitizeLogMessage(err instanceof Error ? err.message : 'Unknown error'))"
        $content = $content -replace "console\.error\(([^,]+),\s*e\s*\)", "console.error(`$1, sanitizeLogMessage(e instanceof Error ? e.message : 'Unknown error'))"
        
        # Fix console.log patterns with error objects
        $content = $content -replace "console\.log\(([^,]+),\s*error\s*\)", "console.log(`$1, sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'))"
        
        Set-Content $fullPath $content -NoNewline
        Write-Host "Fixed $file"
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nAll files processed!" -ForegroundColor Green

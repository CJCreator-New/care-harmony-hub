# Batch Fix Script for Log Injection Issues
# Run this in PowerShell from the project root

$ErrorActionPreference = "Continue"

$files = @(
    "src\hooks\useDrugUtilizationReview.ts",
    "src\hooks\useEnhancedNotifications.ts",
    "src\hooks\useErrorTracking.ts",
    "src\hooks\useIntegration.ts",
    "src\hooks\useIntelligentTaskRouter.ts",
    "src\hooks\useOptimisticMutation.ts",
    "src\hooks\useRefillRequests.ts",
    "src\hooks\useSecureMessaging.ts",
    "src\hooks\useTaskAssignments.ts",
    "src\hooks\useTriageAssessments.ts",
    "src\hooks\useVitalSigns.ts",
    "src\hooks\useVoiceTranscription.ts",
    "src\hooks\useWorkflowNotifications.ts",
    "src\components\integration\InterRoleCommunicationHub.tsx",
    "src\components\integration\TaskAssignmentSystem.tsx",
    "src\components\nurse\PatientPrepChecklistCard.tsx",
    "src\lib\monitoring\sentry.ts",
    "src\pages\hospital\LoginPage.tsx"
)

$fixedCount = 0
$errorCount = 0

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        
        try {
            $content = Get-Content $fullPath -Raw -Encoding UTF8
            $originalContent = $content
            
            # Add import if not present
            if ($content -notmatch "import.*sanitizeLogMessage.*from") {
                $importLine = "import { sanitizeLogMessage } from '@/utils/sanitize';"
                
                # Find position after last import
                if ($content -match "(?s)(import[^;]+;[\r\n]+)+") {
                    $content = $content -replace "(import[^;]+;[\r\n]+)+", "`$0$importLine`r`n"
                }
            }
            
            # Replace console.error with error parameter
            $content = $content -replace "console\.error\(([^,)]+),\s*error\s*\)", "console.error(`$1, sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'))"
            
            # Replace console.error with other variables
            $content = $content -replace "console\.error\(([^,)]+),\s*(\w+)\s*\)", "console.error(`$1, sanitizeLogMessage(`$2 instanceof Error ? `$2.message : String(`$2)))"
            
            # Only write if changed
            if ($content -ne $originalContent) {
                Set-Content $fullPath $content -Encoding UTF8 -NoNewline
                Write-Host "  Fixed" -ForegroundColor Green
                $fixedCount++
            } else {
                Write-Host "  No changes needed" -ForegroundColor Gray
            }
        }
        catch {
            Write-Host "  Error: $_" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "  File not found: $file" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "Batch fix complete!" -ForegroundColor Cyan
Write-Host "Fixed: $fixedCount files" -ForegroundColor Green
Write-Host "Errors: $errorCount files" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the changes" -ForegroundColor White
Write-Host "2. Run: npm run type-check" -ForegroundColor White
Write-Host "3. Run: npm run lint" -ForegroundColor White
Write-Host "4. Test the application" -ForegroundColor White

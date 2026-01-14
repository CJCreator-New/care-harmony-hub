# Batch Fix Script for Log Injection Issues
# Run this in PowerShell from the project root

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
    "src\lib\performance\web-vitals.ts",
    "src\pages\hospital\LoginPage.tsx",
    "src\main.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        
        # Add import if not present
        if ($content -notmatch "import.*sanitizeLogMessage.*from.*@/utils/sanitize") {
            # Find the last import statement
            $lines = $content -split "`n"
            $lastImportIndex = -1
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import ") {
                    $lastImportIndex = $i
                }
            }
            
            if ($lastImportIndex -ge 0) {
                $lines = $lines[0..$lastImportIndex] + "import { sanitizeLogMessage } from '@/utils/sanitize';" + $lines[($lastImportIndex + 1)..($lines.Count - 1)]
                $content = $lines -join "`n"
            }
        }
        
        # Replace console.error patterns
        $content = $content -replace "console\.error\(([^,]+),\s*error\);", "console.error(`$1, sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));"
        $content = $content -replace "console\.error\(([^,]+),\s*(\w+)\);", "console.error(`$1, sanitizeLogMessage(`$2 instanceof Error ? `$2.message : String(`$2)));"
        
        # Replace console.log patterns for user input
        $content = $content -replace "console\.log\(([^,]+),\s*(\w+)\);", "console.log(`$1, sanitizeLogMessage(String(`$2)));"
        
        # Write back
        Set-Content $fullPath $content -NoNewline
        Write-Host "  ✓ Fixed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nBatch fix complete!" -ForegroundColor Cyan
Write-Host "Please review the changes and run: npm run type-check" -ForegroundColor Cyan

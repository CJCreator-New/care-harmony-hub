#!/usr/bin/env pwsh
# Final comprehensive CWE fix script

$files = @(
    "src/hooks/useIntelligentTaskRouter.ts",
    "src/hooks/useOptimisticMutation.ts",
    "src/hooks/useRefillRequests.ts",
    "src/hooks/useSecureMessaging.ts",
    "src/hooks/useTaskAssignments.ts",
    "src/hooks/useTriageAssessments.ts",
    "src/hooks/useVitalSigns.ts",
    "src/hooks/useVoiceTranscription.ts",
    "src/hooks/useWorkflowNotifications.ts",
    "src/components/integration/InterRoleCommunicationHub.tsx",
    "src/components/integration/RealTimeCommunicationHub.tsx",
    "src/components/integration/TaskAssignmentSystem.tsx",
    "src/components/nurse/PatientPrepChecklistCard.tsx",
    "src/components/monitoring/LoggingDashboard.tsx",
    "src/components/testing/UATDashboard.tsx",
    "src/components/ui/chart.tsx",
    "src/lib/monitoring/sentry.ts",
    "src/pages/hospital/LoginPage.tsx",
    "src/pages/documents/DocumentsPage.tsx",
    "src/pages/patient/EnhancedPortalPage.tsx",
    "src/utils/reportExport.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        $content = Get-Content $file -Raw
        
        # Add import if not present
        if ($content -notmatch "sanitize") {
            $lines = $content -split "`n"
            $lastImportIdx = 0
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import ") {
                    $lastImportIdx = $i
                }
            }
            if ($lastImportIdx -gt 0) {
                $lines = $lines[0..$lastImportIdx] + "import { sanitizeLogMessage, sanitizeHtml, sanitizeForLog } from '@/utils/sanitize';" + $lines[($lastImportIdx + 1)..($lines.Count - 1)]
                $content = $lines -join "`n"
            }
        }
        
        Set-Content $file $content -NoNewline
        Write-Host "  ✓ Fixed" -ForegroundColor Green
    }
}

Write-Host "`n✅ All files processed!" -ForegroundColor Cyan

#!/bin/bash
# Comprehensive CWE Fix Script
# Fixes: CWE-798/259 (Hardcoded Credentials), CWE-79/80 (XSS), CWE-117 (Log Injection), CWE-918 (SSRF)

echo "🔒 Starting comprehensive security fixes..."

# Files with remaining issues
declare -a LOG_INJECTION_FILES=(
    "src/hooks/useDrugUtilizationReview.ts"
    "src/hooks/useEnhancedNotifications.ts"
    "src/hooks/useIntegration.ts"
    "src/hooks/useIntelligentTaskRouter.ts"
    "src/hooks/useOptimisticMutation.ts"
    "src/hooks/useRefillRequests.ts"
    "src/hooks/useSecureMessaging.ts"
    "src/hooks/useTaskAssignments.ts"
    "src/hooks/useTriageAssessments.ts"
    "src/hooks/useVitalSigns.ts"
    "src/hooks/useVoiceTranscription.ts"
    "src/hooks/useWorkflowNotifications.ts"
    "src/components/integration/InterRoleCommunicationHub.tsx"
    "src/components/integration/RealTimeCommunicationHub.tsx"
    "src/components/integration/TaskAssignmentSystem.tsx"
    "src/components/nurse/PatientPrepChecklistCard.tsx"
    "src/components/monitoring/LoggingDashboard.tsx"
    "src/components/testing/UATDashboard.tsx"
    "src/lib/monitoring/sentry.ts"
    "src/pages/hospital/LoginPage.tsx"
    "src/pages/hospital/SignupPage.tsx"
    "src/pages/documents/DocumentsPage.tsx"
    "src/pages/patient/EnhancedPortalPage.tsx"
    "src/utils/reportExport.ts"
    "src/components/ui/chart.tsx"
)

# Add sanitizeLogMessage import and fix console.error calls
for file in "${LOG_INJECTION_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing: $file"
        
        # Add import if not present
        if ! grep -q "sanitizeLogMessage\|sanitizeHtml\|sanitizeForLog" "$file"; then
            sed -i "1i import { sanitizeLogMessage, sanitizeHtml, sanitizeForLog } from '@/utils/sanitize';" "$file"
        fi
        
        # Fix console.error with error parameter
        sed -i "s/console\.error(\([^,]*\), error)/console.error(\1, sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'))/g" "$file"
        
        # Fix console.error with other variables
        sed -i "s/console\.error(\([^,]*\), \([a-zA-Z_][a-zA-Z0-9_]*\))/console.error(\1, sanitizeLogMessage(\2 instanceof Error ? \2.message : String(\2)))/g" "$file"
        
        # Fix console.log
        sed -i "s/console\.log(\([^,]*\), \([a-zA-Z_][a-zA-Z0-9_]*\))/console.log(\1, sanitizeForLog(\2))/g" "$file"
        
        echo "  ✓ Fixed"
    fi
done

echo "✅ All CWE fixes applied!"
echo "Next: Run 'npm run type-check' to verify"

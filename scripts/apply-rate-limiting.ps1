$functions = @(
    "fhir-integration",
    "insurance-integration",
    "symptom-analysis",
    "send-notification",
    "analytics-engine"
)

foreach ($func in $functions) {
    $file = "supabase\functions\$func\index.ts"
    if (!(Test-Path $file)) { continue }
    
    $content = Get-Content $file -Raw
    
    if ($content -notmatch "rateLimit") {
        # Add import
        $content = $content -replace '(import .+ from "https://esm.sh/@supabase/supabase-js@2";)', "`$1`nimport { rateLimit } from `"../_shared/rateLimit.ts`";"
        
        # Add rate limit check after OPTIONS
        $content = $content -replace '(if \(req\.method === "OPTIONS"\) \{[^}]+\})\s+(try \{)', "`$1`n`n  // Apply rate limiting`n  const rateLimitResponse = await rateLimit(req);`n  if (rateLimitResponse) return rateLimitResponse;`n`n  `$2"
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "Applied rate limiting to: $func"
    }
}
Write-Host "`nRate limiting applied!"

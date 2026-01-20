$functions = @(
    @{name="analytics-engine"; roles=@("admin")},
    @{name="fhir-integration"; roles=@("doctor","admin")},
    @{name="insurance-integration"; roles=@("receptionist","admin")},
    @{name="send-notification"; roles=@("doctor","nurse","receptionist","admin")},
    @{name="symptom-analysis"; roles=@("doctor","nurse","admin")}
)

foreach ($func in $functions) {
    $file = "supabase\functions\$($func.name)\index.ts"
    if (!(Test-Path $file)) { continue }
    
    $content = Get-Content $file -Raw
    
    if ($content -notmatch "authorize") {
        $rolesStr = ($func.roles | ForEach-Object { "`"$_`"" }) -join ", "
        
        # Add import
        $content = $content -replace '(import \{ rateLimit \} from "\.\./\_shared/rateLimit\.ts";)', "`$1`nimport { authorize } from `"../_shared/authorize.ts`";"
        
        # Add auth check
        $content = $content -replace '(const rateLimitResponse = await rateLimit\(req[^\)]*\);[\s\S]*?if \(rateLimitResponse\) return rateLimitResponse;)', "`$1`n`n  // Check authorization`n  const authResponse = await authorize(req, [$rolesStr]);`n  if (authResponse) return authResponse;"
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "Applied authorization to: $($func.name)"
    }
}
Write-Host "`nAuthorization applied!"

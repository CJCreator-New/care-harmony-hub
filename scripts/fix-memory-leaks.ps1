$files = @(
    "src\hooks\useAdminStats.ts",
    "src\hooks\useConsultations.ts",
    "src\hooks\useInAppNotifications.ts",
    "src\hooks\useMedications.ts",
    "src\hooks\usePrescriptions.ts",
    "src\hooks\useQueue.ts",
    "src\hooks\useReceptionistStats.ts",
    "src\hooks\useSecureMessaging.ts"
)

foreach ($file in $files) {
    $content = Get-Content $file -Raw
    $content = $content -replace "supabase\.removeChannel\(channel\);", "channel.unsubscribe();"
    Set-Content $file -Value $content -NoNewline
    Write-Host "Fixed: $file"
}
Write-Host "`nMemory leaks fixed!"

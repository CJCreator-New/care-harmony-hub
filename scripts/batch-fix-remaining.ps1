$files = Get-ChildItem "src\hooks\*.ts*" -Recurse | Where-Object { $_.Name -notmatch "use-mobile|use-toast" }

$fixed = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (!$content) { continue }
    
    if ($content -match "console\.(error|log)" -and $content -notmatch "sanitizeForLog") {
        $content = $content -replace "^(import .+;)", "`$1`nimport { sanitizeForLog } from '@/utils/sanitize';"
        $content = $content -replace "console\.error\(([^)]+)\)", "console.error(sanitizeForLog(String(`$1)))"
        $content = $content -replace "console\.log\(([^)]+)\)", "console.log(sanitizeForLog(String(`$1)))"
        
        Set-Content $file.FullName -Value $content -NoNewline
        $fixed++
        Write-Host "Fixed: $($file.Name)"
    }
}
Write-Host "`nTotal fixed: $fixed files"

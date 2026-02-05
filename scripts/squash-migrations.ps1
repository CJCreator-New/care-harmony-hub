param(
  [string]$MigrationsPath = "supabase/migrations",
  [string]$LegacyFolderName = "legacy",
  [string]$DatePrefix = "202602040000"
)

$root = Resolve-Path $MigrationsPath
$legacyPath = Join-Path $root $LegacyFolderName

if (-not (Test-Path $legacyPath)) {
  New-Item -ItemType Directory -Path $legacyPath | Out-Null
}

$patterns = @(
  @{ Name = "core_schema"; Pattern = '(hospital|profile|user_role|patient|appointment|consultation|queue|room|department|role|rbac|staff|inventory|asset|facility)' },
  @{ Name = "scheduling"; Pattern = '(schedule|scheduling|calendar|availability|shift|waitlist|queue|triage)' },
  @{ Name = "billing"; Pattern = '(billing|invoice|payment|insurance|claim|revenue|financial)' },
  @{ Name = "pharmacy"; Pattern = '(pharmacy|prescription|medication|drug|dispens|formulary|refill)' },
  @{ Name = "laboratory"; Pattern = '(lab|laboratory|loinc|specimen|result|qc|quality_control)' },
  @{ Name = "telemedicine"; Pattern = '(telemedicine|virtual|remote|video|session|waiting_room)' },
  @{ Name = "analytics_ai"; Pattern = '(analytics|ai_|ai-|predictive|ml|copilot|insight|reporting|bi_)' },
  @{ Name = "security_compliance"; Pattern = '(security|rls|audit|consent|hipaa|encryption|vault|access|policy)' },
  @{ Name = "portal_documents"; Pattern = '(portal|document|form|upload|consent_form|patient_portal)' },
  @{ Name = "monitoring_ops"; Pattern = '(monitor|logging|alert|notification|backup|recovery|ops|performance|status)' }
)

$allFiles = Get-ChildItem -Path $root -Filter *.sql | Where-Object { $_.Name -notmatch 'consolidated' -and $_.DirectoryName -ne $legacyPath }
$ordered = $allFiles | Sort-Object Name

$grouped = @{}
$ordered | ForEach-Object {
  $file = $_
  $assigned = $false
  foreach ($entry in $patterns) {
    if ($file.Name -match $entry.Pattern) {
      if (-not $grouped.ContainsKey($entry.Name)) { $grouped[$entry.Name] = @() }
      $grouped[$entry.Name] += $file
      $assigned = $true
      break
    }
  }
  if (-not $assigned) {
    if (-not $grouped.ContainsKey('misc')) { $grouped['misc'] = @() }
    $grouped['misc'] += $file
  }
}

$groupOrder = $patterns.Name + @('misc')
$index = 1

foreach ($groupName in $groupOrder) {
  if (-not $grouped.ContainsKey($groupName)) { continue }

  $outputFile = Join-Path $root ("{0}{1:D2}_{2}.sql" -f $DatePrefix, $index, $groupName)
  $index++

  "-- Consolidated migration group: $groupName" | Set-Content $outputFile
  "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Add-Content $outputFile
  "-- Source migrations: $($grouped[$groupName].Count)" | Add-Content $outputFile
  "" | Add-Content $outputFile

  foreach ($file in $grouped[$groupName]) {
    "-- ============================================" | Add-Content $outputFile
    "-- Migration: $($file.Name)" | Add-Content $outputFile
    "-- ============================================" | Add-Content $outputFile
    "" | Add-Content $outputFile
    Get-Content $file.FullName | Add-Content $outputFile
    "" | Add-Content $outputFile
    "" | Add-Content $outputFile
  }
}

# Move original migrations into legacy folder
foreach ($file in $ordered) {
  Move-Item -Path $file.FullName -Destination (Join-Path $legacyPath $file.Name)
}

Write-Output "Consolidated groups: $($grouped.Keys -join ', ')"
Write-Output "Legacy migrations moved to: $legacyPath"

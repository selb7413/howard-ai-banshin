# AI Sync Health Check
$root = $PSScriptRoot
$errors = 0

$gdriveRoot = $null
foreach ($drive in (Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -ne 'C' -and $_.Name -ne 'D' -and $_.Name -ne 'E' })) {
    $drivePath = $drive.Root
    $children = Get-ChildItem $drivePath -ErrorAction SilentlyContinue
    if ($children -and $children.Count -gt 0) {
        $gdriveRoot = $drivePath
        break
    }
}

Write-Host ''
Write-Host '========================================'
Write-Host ('  AI Check - ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
Write-Host '========================================'
Write-Host ''

Write-Host '[1] AI folder...' -NoNewline
if (Test-Path $root) { Write-Host ' OK  ' + $root } else { Write-Host ' FAIL'; $errors++ }

Write-Host '[2] CLAUDE.md...' -NoNewline
if (Test-Path (Join-Path $root 'CLAUDE.md')) { Write-Host ' OK' } else { Write-Host ' FAIL'; $errors++ }

Write-Host '[3] MEMORY.md...' -NoNewline
if (Test-Path (Join-Path $root '000_Agent\memory\MEMORY.md')) { Write-Host ' OK' } else { Write-Host ' WARN' }

Write-Host '[4] Skills...' -NoNewline
if (Test-Path (Join-Path $env:USERPROFILE '.claude\skills')) { Write-Host ' OK' } else { Write-Host ' WARN' }

Write-Host '[5] Git...' -NoNewline
if (Test-Path (Join-Path $root '.git')) {
    $uncommitted = (git -C $root status --porcelain 2>$null)
    $remote = (git -C $root remote get-url origin 2>$null)
    if ($uncommitted) { Write-Host (' WARN: ' + ($uncommitted | Measure-Object -Line).Lines + ' uncommitted') }
    elseif ($remote) { Write-Host (' OK  remote: ' + $remote) }
    else { Write-Host ' WARN: no GitHub remote yet' }
} else { Write-Host ' FAIL'; $errors++ }

Write-Host '[6] Google Drive...' -NoNewline
if ($gdriveRoot) { Write-Host (' OK  ' + $gdriveRoot) } else { Write-Host ' WARN: not detected' }

Write-Host ''
Write-Host '========================================'
if ($errors -eq 0) { Write-Host '  Result: All OK!' } else { Write-Host ('  Result: ' + $errors + ' error(s) found') }
Write-Host '========================================'
Write-Host ''
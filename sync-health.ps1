# AI 分身同步體檢腳本 by 雷小蒙
# 使用方式：在 PowerShell 執行 .\sync-health.ps1

$root = "C:\Users\Howard\Desktop\Hoawrd影分身之術"
$gdrive = "G:\我的雲端硬碟"
$errors = 0

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AI 分身同步體檢 - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. 檢查 AI 分身資料夾是否存在
Write-Host "[1] AI 分身資料夾..." -NoNewline
if (Test-Path $root) {
    Write-Host " OK  $root" -ForegroundColor Green
} else {
    Write-Host " FAIL 找不到 $root" -ForegroundColor Red
    $errors++
}

# 2. 檢查 CLAUDE.md
Write-Host "[2] CLAUDE.md..." -NoNewline
if (Test-Path "$root\CLAUDE.md") {
    $lastWrite = (Get-Item "$root\CLAUDE.md").LastWriteTime
    Write-Host " OK  (最後修改: $($lastWrite.ToString('MM/dd HH:mm')))" -ForegroundColor Green
} else {
    Write-Host " FAIL 找不到 CLAUDE.md" -ForegroundColor Red
    $errors++
}

# 3. 檢查 MEMORY.md
Write-Host "[3] MEMORY.md..." -NoNewline
if (Test-Path "$root\000_Agent\memory\MEMORY.md") {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " WARN 找不到 MEMORY.md" -ForegroundColor Yellow
}

# 4. 檢查 Skills symlink
Write-Host "[4] Skills symlink..." -NoNewline
$skillsLink = "$env:USERPROFILE\.claude\skills"
if (Test-Path $skillsLink) {
    $target = (Get-Item $skillsLink).Target
    if ($target) {
        Write-Host " OK  symlink -> $target" -ForegroundColor Green
    } else {
        Write-Host " OK  (一般資料夾)" -ForegroundColor Green
    }
} else {
    Write-Host " WARN ~/.claude/skills 不存在" -ForegroundColor Yellow
}

# 5. 檢查 git 狀態
Write-Host "[5] Git 備份狀態..." -NoNewline
$gitDir = "$root\.git"
if (Test-Path $gitDir) {
    $uncommitted = & git -C $root status --porcelain 2>$null
    $remoteUrl = & git -C $root remote get-url origin 2>$null
    if ($uncommitted) {
        $count = ($uncommitted | Measure-Object -Line).Lines
        Write-Host " WARN $count 個未提交的變更" -ForegroundColor Yellow
    } elseif ($remoteUrl) {
        Write-Host " OK  已連結 $remoteUrl" -ForegroundColor Green
    } else {
        Write-Host " WARN git 已初始化但尚未設定 remote（還沒連 GitHub）" -ForegroundColor Yellow
    }
} else {
    Write-Host " FAIL git 未初始化" -ForegroundColor Red
    $errors++
}

# 6. 檢查 Google Drive 是否掛載
Write-Host "[6] Google Drive..." -NoNewline
if (Test-Path $gdrive) {
    Write-Host " OK  $gdrive 已掛載" -ForegroundColor Green
} else {
    Write-Host " WARN Google Drive 未掛載（確認 Google Drive 桌面版是否執行）" -ForegroundColor Yellow
}

# 結果總結
Write-Host "`n========================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "  結果：全部通過！AI 分身狀態健康 OK" -ForegroundColor Green
} else {
    Write-Host "  結果：發現 $errors 個錯誤，請依上方提示處理" -ForegroundColor Red
}
Write-Host "========================================`n" -ForegroundColor Cyan

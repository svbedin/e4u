# E4U — первоначальная настройка проекта на компьютере
# Copyright (c) 2026 Serg. All rights reserved.
# Запуск: двойной щелчок по setup.cmd в папке проекта.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'  # faster downloads in Windows PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "   OK  $t" -ForegroundColor Green }
function Warn($t) { Write-Host "   !!  $t" -ForegroundColor Yellow }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

Write-Host "E4U: настройка проекта в $Root" -ForegroundColor White

# 1. Старые файлы версии 1
Step "1/5 Удаляю устаревшие файлы"
foreach ($f in 'www\js\app.js', 'www\js\data.js', 'www\js\i18n.js') {
  if (Test-Path $f) { Remove-Item $f; Ok "удалён $f" } else { Ok "$f уже нет" }
}

# 2. Инструменты
Step "2/5 Проверяю Node.js и Git"
$node = Has 'node'; $git = Has 'git'
if ($node) { Ok ("Node.js " + (node -v)) } else { Warn "Node.js не найден. Установите: winget install OpenJS.NodeJS.LTS  (или https://nodejs.org), затем запустите setup.cmd снова." }
if ($git)  { Ok ((git --version)) }        else { Warn "Git не найден. Установите: winget install Git.Git  (или https://git-scm.com), затем запустите setup.cmd снова." }

# 3. Шрифты (SIL Open Font License, можно распространять вместе с приложением)
Step "3/5 Скачиваю шрифты в www\fonts"
New-Item -ItemType Directory -Force -Path 'www\fonts' | Out-Null
$base = 'https://raw.githubusercontent.com/google/fonts/main/ofl'
$fonts = @(
  @{ url = "$base/manrope/Manrope%5Bwght%5D.ttf";     out = 'www\fonts\Manrope-Variable.ttf' },
  @{ url = "$base/manrope/OFL.txt";                   out = 'www\fonts\OFL-Manrope.txt' },
  @{ url = "$base/unbounded/Unbounded%5Bwght%5D.ttf"; out = 'www\fonts\Unbounded-Variable.ttf' },
  @{ url = "$base/unbounded/OFL.txt";                 out = 'www\fonts\OFL-Unbounded.txt' }
)
$fontsOk = $true
foreach ($f in $fonts) {
  try {
    Invoke-WebRequest -Uri $f.url -OutFile $f.out -UseBasicParsing
    Ok ("{0} ({1:N0} КБ)" -f $f.out, ((Get-Item $f.out).Length / 1KB))
  } catch { $fontsOk = $false; Warn ("не удалось скачать {0}: {1}" -f $f.url, $_.Exception.Message) }
}

# 4. Офлайн-кэш и история версий
Step "4/5 Готовлю версию и историю (git)"
if ($node) { node tools/release.mjs }
if ($git) {
  if (-not (Test-Path '.git')) { git init -b main | Out-Null; Ok "создан репозиторий git" }
  $name = git config user.name
  if (-not $name) {
    $name = Read-Host "   Имя автора для истории версий (Enter = Serg)"
    if (-not $name) { $name = 'Serg' }
    git config user.name "$name"
  }
  $mail = git config user.email
  if (-not $mail) {
    $mail = Read-Host "   E-mail автора (Enter = inbox@uset.sk)"
    if (-not $mail) { $mail = 'inbox@uset.sk' }
    git config user.email "$mail"
  }
  git add -A
  $pending = git status --porcelain
  if ($pending) { git commit -q -m "E4U 2.0.0: модульная архитектура, шрифты внутри приложения"; Ok "сохранена версия в истории git" }
  else { Ok "изменений для сохранения нет" }
  git log --oneline -n 3
}

# 5. Запуск
Step "5/5 Запускаю приложение"
if ($node) {
  Start-Process powershell -WorkingDirectory $Root -ArgumentList '-NoExit', '-Command', 'npm start'
  Start-Sleep -Seconds 2
  Start-Process 'http://localhost:8080'
  Ok "приложение открыто: http://localhost:8080 (сервер работает в отдельном окне, закройте его, чтобы остановить)"
} else { Warn "пропущено: нужен Node.js" }

Write-Host ""
if (-not $fontsOk) { Warn "Шрифты скачались не все — приложение работает со системным шрифтом. Запустите setup.cmd ещё раз при наличии интернета." }
Write-Host "Готово." -ForegroundColor Green
Read-Host "Нажмите Enter, чтобы закрыть окно"

param([int]$Port = 5188)
$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$gameUrl = "http://127.0.0.1:$Port"
$nodeCommand = Get-Command node -ErrorAction Stop
$builtPath = Join-Path $gameRoot 'dist\index.html'
$needsBuild = -not (Test-Path -LiteralPath $builtPath)
if (-not $needsBuild) {
    $builtTime = (Get-Item -LiteralPath $builtPath).LastWriteTimeUtc
    $sourceFiles = @(Get-ChildItem -LiteralPath (Join-Path $gameRoot 'src') -File -Recurse) + @(Get-ChildItem -LiteralPath (Join-Path $gameRoot 'public') -File -Recurse) + @(Get-Item -LiteralPath (Join-Path $gameRoot 'index.html'), (Join-Path $gameRoot 'package.json'), (Join-Path $gameRoot 'vite.config.js'))
    $needsBuild = @($sourceFiles | Where-Object { $_.LastWriteTimeUtc -gt $builtTime }).Count -gt 0
}
if ($needsBuild) {
    Push-Location -LiteralPath $gameRoot
    try {
        if (-not (Test-Path -LiteralPath (Join-Path $gameRoot 'node_modules'))) { & npm.cmd install --no-audit --no-fund }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw '构建失败，请查看上方输出。' }
    } finally { Pop-Location }
}
$revision = (Get-FileHash -LiteralPath $builtPath -Algorithm SHA256).Hash.ToLowerInvariant().Substring(0, 12)
$launchUrl = "$gameUrl/?v=$revision"
try {
    $existingPage = Invoke-WebRequest -Uri $gameUrl -TimeoutSec 2
    if ($existingPage.Content -match '(BELOW THE OATH|CINDER VAULT)') {
        Start-Process $launchUrl
        exit 0
    }
    throw "端口 $Port 已被其他程序使用。请用 -Port 指定空闲端口。"
} catch {
    if ($_.Exception.Message -match '已被其他程序使用') { throw }
}
$serverPath = Join-Path $gameRoot 'server.mjs'
$serverArguments = @('"' + $serverPath + '"', '--port', "$Port")
Start-Process -FilePath $nodeCommand.Source -ArgumentList $serverArguments -WorkingDirectory $gameRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $gameRoot '.server.log') -RedirectStandardError (Join-Path $gameRoot '.server-error.log')
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    try { $response = Invoke-WebRequest -Uri $gameUrl -TimeoutSec 1; if ($response.StatusCode -eq 200) { Start-Process $launchUrl; exit 0 } } catch { Start-Sleep -Milliseconds 250 }
}
throw '服务未启动，请查看 .server-error.log。'

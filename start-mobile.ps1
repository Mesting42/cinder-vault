param([int]$Port = 5189)
$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$gameUrl = "http://127.0.0.1:$Port"
$builtPath = Join-Path $gameRoot 'dist\index.html'
Push-Location -LiteralPath $gameRoot
try {
    if (-not (Test-Path -LiteralPath (Join-Path $gameRoot 'node_modules'))) { & npm.cmd install --no-audit --no-fund }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw '构建失败。' }
} finally { Pop-Location }
$revision = (Get-FileHash -LiteralPath $builtPath -Algorithm SHA256).Hash.ToLowerInvariant().Substring(0,12)
$responding = $false
try {
    $existing = Invoke-WebRequest -Uri "$gameUrl/version.json" -UseBasicParsing -TimeoutSec 2
    $service = $existing.Content | ConvertFrom-Json
    if ($service.id -ne 'cinder-vault' -and $service.game -notin @('BELOW THE OATH','CINDER VAULT')) { throw "端口 $Port 已被其他程序使用。" }
    $responding = $true
} catch { if ($_.Exception.Message -match '已被其他程序使用') { throw } }
if (-not $responding) {
    $nodeCommand = Get-Command node -ErrorAction Stop
    $serverPath = Join-Path $gameRoot 'server.mjs'
    Start-Process -FilePath $nodeCommand.Source -ArgumentList @('"' + $serverPath + '"','--port',"$Port",'--host','0.0.0.0') -WorkingDirectory $gameRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $gameRoot '.mobile-server.log') -RedirectStandardError (Join-Path $gameRoot '.mobile-server-error.log')
}
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    try {
        $service = (Invoke-WebRequest -Uri "$gameUrl/version.json" -UseBasicParsing -TimeoutSec 1).Content | ConvertFrom-Json
        if ($service.id -eq 'cinder-vault' -or $service.game -in @('BELOW THE OATH','CINDER VAULT')) {
            Write-Host "电脑入口：$gameUrl/?v=$revision"
            Write-Host '手机和平板请连接同一 Wi-Fi，并横向握持设备：'
            Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { Write-Host "http://$($_.IPAddress):$Port/?v=$revision" }
            Start-Process "$gameUrl/?v=$revision"
            exit 0
        }
    } catch { Start-Sleep -Milliseconds 250 }
}
throw '移动端服务未启动，请查看 .mobile-server-error.log。'

# Kill process using port 3000 and remove Next.js dev lock so "npm run dev" can start
$ErrorActionPreference = "SilentlyContinue"
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Remove-Item "$PSScriptRoot\..\.next\dev\lock" -Force -ErrorAction SilentlyContinue
Write-Host "Cleaned. Starting dev server..."

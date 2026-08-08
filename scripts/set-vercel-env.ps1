# Pushes the production environment variables to Vercel.
#
# Reads DATABASE_URL and DIRECT_URL straight out of your local .env and pipes
# them to `vercel env add`, so the values never have to be copied by hand and
# never appear on screen. AUTH_SECRET is generated fresh - production should
# never reuse the local signing key.
#
# Two Windows PowerShell 5.1 quirks are worked around here:
#   1. ASCII only. Non-ASCII in a .ps1 without a UTF-8 BOM breaks parsing.
#   2. The Vercel CLI prints its version banner to stderr. Redirecting a native
#      command's stderr in 5.1 wraps every line in an ErrorRecord, which trips
#      $ErrorActionPreference = "Stop". So stderr is left alone and success is
#      judged by $LASTEXITCODE instead.
#
# Usage (from the project root):
#   .\scripts\set-vercel-env.ps1

if (-not (Test-Path ".env")) {
  Write-Host "No .env found. Run this from the project root." -ForegroundColor Red
  exit 1
}

function Get-EnvValue([string]$name) {
  $line = Get-Content ".env" | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -replace "^$name=", "").Trim().Trim('"')
}

$failed = 0

function Set-VercelEnv([string]$name, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host ("  {0,-22} SKIPPED (empty value)" -f $name) -ForegroundColor Red
    $script:failed++
    return
  }

  # `vercel env add` refuses to overwrite, so clear any existing value first.
  # A missing variable makes this exit non-zero, which is fine.
  vercel env rm $name production --yes | Out-Null

  $value | vercel env add $name production | Out-Null

  if ($LASTEXITCODE -eq 0) {
    Write-Host ("  {0,-22} ok" -f $name) -ForegroundColor Green
  } else {
    Write-Host ("  {0,-22} FAILED (exit {1})" -f $name, $LASTEXITCODE) -ForegroundColor Red
    $script:failed++
  }
}

$database = Get-EnvValue "DATABASE_URL"
$direct   = Get-EnvValue "DIRECT_URL"

if (-not $database) { Write-Host "DATABASE_URL missing from .env" -ForegroundColor Red; exit 1 }
if (-not $direct)   { Write-Host "DIRECT_URL missing from .env"   -ForegroundColor Red; exit 1 }

if ($database -match "localhost") {
  Write-Host "DATABASE_URL still points at localhost. Vercel cannot reach it." -ForegroundColor Red
  exit 1
}
if ($direct -match "localhost") {
  Write-Host "DIRECT_URL still points at localhost. Migrations would run against your laptop." -ForegroundColor Red
  exit 1
}
if ($database -notmatch "pgbouncer=true") {
  Write-Host "warning: DATABASE_URL has no pgbouncer=true; Prisma may fail on reused prepared statements" -ForegroundColor Yellow
}

# 32 random bytes as hex. Never printed.
$authSecret = -join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Minimum 0 -Maximum 256) })

Write-Host "Pushing production environment variables..." -ForegroundColor Cyan
Set-VercelEnv "DATABASE_URL"         $database
Set-VercelEnv "DIRECT_URL"           $direct
Set-VercelEnv "AUTH_SECRET"          $authSecret
Set-VercelEnv "NEXT_PUBLIC_APP_NAME" "RentFlow"

Write-Host ""
if ($failed -eq 0) {
  Write-Host "All variables set. Deploy with:  vercel --prod" -ForegroundColor Green
} else {
  Write-Host "$failed variable(s) failed. Check 'vercel whoami' and 'vercel env ls production'." -ForegroundColor Red
}

Write-Host ""
Write-Host "NEXT_PUBLIC_ENABLE_DEMO_LOGIN was deliberately NOT set. Enabling it" -ForegroundColor Yellow
Write-Host "publishes working credentials on the public login page." -ForegroundColor Yellow

exit $failed

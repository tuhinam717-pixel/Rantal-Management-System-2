# Provisions the `rental` role and `rental_management` database on a local
# PostgreSQL install, then pushes the Prisma schema and seeds demo accounts.
#
# Usage (from the project root):
#   .\scripts\setup-db.ps1 -PostgresPassword "<your postgres superuser password>"

param(
  [Parameter(Mandatory = $true)]
  [string]$PostgresPassword,

  [string]$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe",
  [string]$DbUser = "rental",
  [string]$DbPassword = "rental",
  [string]$DbName = "rental_management"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PsqlPath)) {
  throw "psql not found at '$PsqlPath'. Pass -PsqlPath with the correct location."
}

$env:PGPASSWORD = $PostgresPassword

Write-Host "Creating role '$DbUser'..." -ForegroundColor Cyan
$roleSql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DbUser') THEN
    CREATE ROLE $DbUser LOGIN PASSWORD '$DbPassword' CREATEDB;
  END IF;
END
`$`$;
"@
& $PsqlPath -U postgres -h localhost -p 5432 -d postgres -v ON_ERROR_STOP=1 -c $roleSql

Write-Host "Creating database '$DbName'..." -ForegroundColor Cyan
$exists = & $PsqlPath -U postgres -h localhost -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DbName'"
if ($exists.Trim() -ne "1") {
  & $PsqlPath -U postgres -h localhost -p 5432 -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DbName OWNER $DbUser"
} else {
  Write-Host "  already exists, skipping" -ForegroundColor DarkGray
}

Remove-Item Env:PGPASSWORD

Write-Host "Pushing Prisma schema..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) { throw "prisma db push failed" }

Write-Host "Seeding demo data..." -ForegroundColor Cyan
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { throw "seed failed" }

Write-Host ""
Write-Host "Done. Run 'npm run dev' and sign in with:" -ForegroundColor Green
Write-Host "  admin@rentflow.test    / Admin@123"
Write-Host "  customer@rentflow.test / Customer@123"

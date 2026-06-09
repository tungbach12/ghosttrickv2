# ============================================================
# GhostTrick - SQL Server .bak -> PostgreSQL Migration Script
# ============================================================
# This script:
# 1. Decompresses the .bak.gz backup file
# 2. Restores the .bak into local SQL Server
# 3. Exports all table data as CSV via BCP
# 4. Creates PostgreSQL database & applies EF migrations
# 5. Imports data into PostgreSQL
# 6. Cleans up temp files
# ============================================================

param(
    [string]$BackupFile = "c:\Users\Admin\Downloads\GhostTrickDb_Manual_20260609_095517.bak_1.gz",
    [string]$PgHost = "localhost",
    [string]$PgPort = "5432",
    [string]$PgUser = "postgres",
    [string]$PgPassword = "12345",
    [string]$PgDatabase = "GhostTrickDb",
    [string]$PgBinDir = "E:\Program Files\PostgreSQL\18\bin",
    [string]$SqlHost = "localhost",
    [string]$SqlPort = "1433",
    [string]$SqlUser = "sa",
    [string]$SqlPassword = "12345",
    [string]$SqlInstance = "GhostTrickDb"
)

$ErrorActionPreference = "Continue"
$env:PGPASSWORD = $PgPassword

# Paths
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SrcDir = Join-Path $ProjectRoot "src"
$TempDir = Join-Path $PSScriptRoot "temp"
$PsqlExe = Join-Path $PgBinDir "psql.exe"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GhostTrick DB Migration: MSSQL -> PostgreSQL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Pre-flight checks
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $PsqlExe)) {
    Write-Host "ERROR: psql not found at: $PsqlExe" -ForegroundColor Red
    Write-Host "Please set -PgBinDir to your PostgreSQL bin directory." -ForegroundColor Yellow
    exit 1
}

# Detect sqlcmd and bcp
$sqlcmdPath = (Get-ChildItem "C:\Program Files\Microsoft SQL Server" -Recurse -Filter "sqlcmd.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName)
$bcpPath = (Get-ChildItem "C:\Program Files\Microsoft SQL Server" -Recurse -Filter "bcp.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName)

if (-not $sqlcmdPath) { $sqlcmdPath = (Get-Command "sqlcmd" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source) }
if (-not $bcpPath) { $bcpPath = (Get-Command "bcp" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source) }

if (-not $sqlcmdPath -and -not (Get-Command "sqlcmd" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: sqlcmd not found. Install SQL Server Management Studio or Command Line Utilities." -ForegroundColor Red
    exit 1
}

Write-Host "Using sqlcmd: $sqlcmdPath" -ForegroundColor DarkGray
Write-Host "Using bcp   : $bcpPath" -ForegroundColor DarkGray

# Create temp directory
if (-not (Test-Path $TempDir)) { New-Item -ItemType Directory -Path $TempDir | Out-Null }

# --------------------------------------------------------------
# STEP 1: Decompress .gz backup
# --------------------------------------------------------------
Write-Host "[1/7] Decompressing backup file..." -ForegroundColor Yellow
$bakFile = Join-Path $TempDir "GhostTrickDb.bak"

if (Test-Path $bakFile) {
    Write-Host "  -> .bak file already exists, skipping decompress." -ForegroundColor DarkGray
} else {
    try {
        $inputStream = [System.IO.File]::OpenRead($BackupFile)
        $outputStream = [System.IO.File]::Create($bakFile)
        $gzipStream = New-Object System.IO.Compression.GZipStream($inputStream, [System.IO.Compression.CompressionMode]::Decompress)
        $gzipStream.CopyTo($outputStream)
        $gzipStream.Close()
        $outputStream.Close()
        $inputStream.Close()
        Write-Host "  -> Decompressed to: $bakFile" -ForegroundColor Green
    } catch {
        Write-Host "  -> GZip decompress failed, trying as raw .bak file..." -ForegroundColor Yellow
        Copy-Item $BackupFile $bakFile -Force
    }
}

$bakSize = (Get-Item $bakFile).Length
Write-Host "  -> Backup file size: $([math]::Round($bakSize / 1MB, 2)) MB" -ForegroundColor DarkGray

# --------------------------------------------------------------
# STEP 2: Restore .bak into local SQL Server
# --------------------------------------------------------------
Write-Host "[2/7] Restoring backup into local SQL Server..." -ForegroundColor Yellow

# Drop existing database if exists
& $sqlcmdPath -S "$SqlHost,$SqlPort" -U $SqlUser -P $SqlPassword -d master -Q "IF DB_ID(N'$SqlInstance') IS NOT NULL BEGIN ALTER DATABASE [$SqlInstance] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$SqlInstance]; END" 2>$null
Write-Host "  -> Existing database dropped (if any)." -ForegroundColor DarkGray

# Get logical file names and SQL Server data path
Write-Host "  -> Reading backup file structure..." -ForegroundColor DarkGray
$logicalNamesRaw = & $sqlcmdPath -S "$SqlHost,$SqlPort" -U $SqlUser -P $SqlPassword -d master -Q "RESTORE FILELISTONLY FROM DISK = N'$bakFile'" -h -1 -W 2>&1
Write-Host $logicalNamesRaw

$sqlDataPath = & $sqlcmdPath -S "$SqlHost,$SqlPort" -U $SqlUser -P $SqlPassword -d master -Q "SELECT SERVERPROPERTY('InstanceDefaultDataPath') AS Path" -h -1 -W 2>&1
$sqlDataPath = $sqlDataPath.Trim()

# Parse logical names
$logicalDataName = "GhostTrickDb"
$logicalLogName = "GhostTrickDb_log"
$moveClauses = "MOVE N'$logicalDataName' TO N'$sqlDataPath$SqlInstance.mdf', MOVE N'$logicalLogName' TO N'$sqlDataPath$SqlInstance`_log.ldf'"

# Restore with proper MOVE
Write-Host "  -> Restoring with MOVE to: $sqlDataPath" -ForegroundColor DarkGray
$restoreQuery = "RESTORE DATABASE [$SqlInstance] FROM DISK = N'$bakFile' WITH $moveClauses, REPLACE, RECOVERY"
$restoreOutput = & $sqlcmdPath -S "$SqlHost,$SqlPort" -U $SqlUser -P $SqlPassword -d master -Q $restoreQuery 2>&1

if ($restoreOutput -match "error|terminating") {
    Write-Host "  -> Restore failed: $restoreOutput" -ForegroundColor Red
    exit 1
}
Write-Host $restoreOutput
Write-Host "  -> Database restored!" -ForegroundColor Green

# --------------------------------------------------------------
# STEP 3: Export data from SQL Server via BCP
# --------------------------------------------------------------
Write-Host "[3/7] Exporting data from SQL Server..." -ForegroundColor Yellow

$exportSql = @'
SET NOCOUNT ON;
SELECT TABLE_SCHEMA + '.' + TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE' 
  AND TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME NOT LIKE '__EFMigrations%'
ORDER BY TABLE_NAME;
'@

$tablesResult = & $sqlcmdPath -S "$SqlHost,$SqlPort" -U $SqlUser -P $SqlPassword -d $SqlInstance -Q $exportSql -h -1 -W 2>&1
$tables = ($tablesResult -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match "^dbo\." }) | ForEach-Object { $_ -replace "^dbo\.", "" }

Write-Host "  -> Found tables: $($tables.Count)" -ForegroundColor DarkGray
$tables | ForEach-Object { Write-Host "    - $_" -ForegroundColor DarkGray }

foreach ($table in $tables) {
    if ([string]::IsNullOrWhiteSpace($table)) { continue }
    
    Write-Host "  -> Exporting: $table" -ForegroundColor DarkGray
    
    $csvFile = Join-Path $TempDir "export_${table}.csv"
    $headerFile = Join-Path $TempDir "header_${table}.txt"
    
    # Get column names
    $colQuery = "SET NOCOUNT ON; SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '$table' AND TABLE_SCHEMA = 'dbo' ORDER BY ORDINAL_POSITION"
    $colResult = & $sqlcmdPath -S "$SqlHost,$SqlPort" -U $SqlUser -P $SqlPassword -d $SqlInstance -Q $colQuery -h -1 -W 2>&1
    $columns = ($colResult -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" -and $_ -notmatch "^\(\d+ rows? affected\)" -and $_ -ne "" })
    
    if ($columns.Count -eq 0) { continue }
    
    $colList = ($columns | ForEach-Object { "`"$_`"" }) -join ","
    $selectList = ($columns | ForEach-Object { "[$_]" }) -join ","
    
    # Export using BCP directly to file
    if ($bcpPath) {
        & $bcpPath "SELECT $selectList FROM [$SqlInstance].[dbo].[$table]" queryout $csvFile -S "$SqlHost,$SqlPort" -U $SqlUser -P $SqlPassword -c -t "|~|" -r "|#|" 2>&1 | Out-Null
    } else {
        & $sqlcmdPath -S "$SqlHost,$SqlPort" -U $SqlUser -P $SqlPassword -d $SqlInstance -Q "SET NOCOUNT ON; SELECT $selectList FROM [$SqlInstance].[dbo].[$table]" -o $csvFile -s "|~|" -W 2>&1 | Out-Null
    }
    
    if ((Test-Path $csvFile) -and (Get-Item $csvFile).Length -gt 0) {
        $colList | Out-File -FilePath $headerFile -Encoding UTF8
        Write-Host "    [OK] Exported $((Get-Content $csvFile | Measure-Object).Count) rows" -ForegroundColor DarkGreen
    } else {
        Write-Host "    [SKIP] Empty table (skipped)" -ForegroundColor DarkGray
    }
}

# --------------------------------------------------------------
# STEP 4: Create/Reset PostgreSQL database
# --------------------------------------------------------------
Write-Host "[4/7] Setting up PostgreSQL database..." -ForegroundColor Yellow

& $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d postgres -c "DROP DATABASE IF EXISTS `"$PgDatabase`";" 2>$null
& $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d postgres -c "CREATE DATABASE `"$PgDatabase`";"
Write-Host "  -> Database '$PgDatabase' created!" -ForegroundColor Green

# --------------------------------------------------------------
# STEP 5: Apply EF Core migrations
# --------------------------------------------------------------
Write-Host "[5/7] Applying EF Core migrations to create schema..." -ForegroundColor Yellow

Push-Location $SrcDir
dotnet ef database update --project GhostTrick.Infrastructure --startup-project GhostTrick.WebApi 2>&1 | ForEach-Object {
    if ($_ -match "Applying migration") { Write-Host "  -> $_" -ForegroundColor DarkGray }
}
Pop-Location

Write-Host "  -> Schema created via migrations!" -ForegroundColor Green

# --------------------------------------------------------------
# STEP 6: Import data into PostgreSQL
# --------------------------------------------------------------
Write-Host "[6/7] Importing data into PostgreSQL..." -ForegroundColor Yellow

# Table name mapping (SQL Server -> PostgreSQL / EF Core)
$tableMapping = @{
    "AspNetRoles" = "AspNetRoles"
    "AspNetUsers" = "AspNetUsers"
    "AspNetUserRoles" = "AspNetUserRoles"
    "AspNetUserClaims" = "AspNetUserClaims"
    "AspNetUserLogins" = "AspNetUserLogins"
    "AspNetUserTokens" = "AspNetUserTokens"
    "AspNetRoleClaims" = "AspNetRoleClaims"
    "Products" = "Products"
    "Categories" = "Categories"
    "ProductColors" = "ProductColors"
    "ProductVariants" = "ProductVariants"
    "ProductImages" = "ProductImages"
    "SizeCharts" = "SizeCharts"
    "Orders" = "Orders"
    "OrderItems" = "OrderItems"
    "SaleEvents" = "SaleEvents"
    "SaleEventProducts" = "SaleEventProducts"
    "HomeBanners" = "HomeBanners"
    "Vouchers" = "Vouchers"
    "VoucherUsages" = "VoucherUsages"
    "UserVouchers" = "UserVouchers"
    "Policies" = "Policies"
    "RefreshTokens" = "RefreshTokens"
    "OtpCodes" = "OtpCodes"
    "CartItems" = "CartItems"
    "InventoryTransactions" = "InventoryTransactions"
    "OrderTimelines" = "OrderTimelines"
    "Feedbacks" = "Feedbacks"
    "ProductReviews" = "ProductReviews"
    "TopBarPromos" = "TopBarPromos"
    "SystemSettings" = "SystemSettings"
}

# Disable FK constraints temporarily
& $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -c "SET session_replication_role = 'replica';"

foreach ($table in $tables) {
    if ([string]::IsNullOrWhiteSpace($table)) { continue }
    
    $csvFile = Join-Path $TempDir "export_${table}.csv"
    $headerFile = Join-Path $TempDir "header_${table}.txt"
    
    if (-not (Test-Path $csvFile) -or (Get-Item $csvFile).Length -eq 0) { continue }
    
    $pgTable = if ($tableMapping.ContainsKey($table)) { $tableMapping[$table] } else { $table }
    $colList = if (Test-Path $headerFile) { (Get-Content $headerFile -Raw).Trim() } else { "" }
    
    Write-Host "  -> Importing: $pgTable" -ForegroundColor DarkGray
    
    try {
        $content = Get-Content $csvFile -Raw -ErrorAction SilentlyContinue
        if ([string]::IsNullOrWhiteSpace($content)) {
            Write-Host "    [SKIP] No data (skipped)" -ForegroundColor DarkGray
            continue
        }
        
        $rows = $content -split "\|#\|" | Where-Object { $_ -ne "" -and $_ -ne "`r`n" -and $_ -ne "`n" }
        $columns = (Get-Content $headerFile -Raw).Trim()
        
        $insertBatch = @()
        $batchSize = 100
        $rowCount = 0
        
        foreach ($row in $rows) {
            $row = $row.Trim()
            if ([string]::IsNullOrWhiteSpace($row)) { continue }
            
            $fields = $row -split "\|~\|"
            $values = @()
            foreach ($field in $fields) {
                $field = $field.Trim()
                if ($field -eq "" -or $field -eq "NULL") {
                    $values += "NULL"
                } else {
                    $escaped = $field -replace "'", "''"
                    $values += "'$escaped'"
                }
            }
            
            $insertBatch += "(" + ($values -join ",") + ")"
            $rowCount++
            
            if ($insertBatch.Count -ge $batchSize) {
                $sql = "INSERT INTO `"$pgTable`" ($columns) VALUES " + ($insertBatch -join ",`n") + " ON CONFLICT DO NOTHING;"
                $sql | & $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -q 2>$null
                $insertBatch = @()
            }
        }
        
        if ($insertBatch.Count -gt 0) {
            $sql = "INSERT INTO `"$pgTable`" ($columns) VALUES " + ($insertBatch -join ",`n") + " ON CONFLICT DO NOTHING;"
            $sql | & $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -q 2>$null
        }
        
        Write-Host "    [OK] Imported $rowCount rows" -ForegroundColor DarkGreen
    } catch {
        Write-Host "    [ERR] Error importing $pgTable : $_" -ForegroundColor Red
    }
}

# Re-enable FK constraints
& $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -c "SET session_replication_role = 'origin';"

# Reset sequences
Write-Host "  -> Resetting sequences..." -ForegroundColor DarkGray
$resetSeqSql = @'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.table_name, c.column_name, pg_get_serial_sequence(c.table_name, c.column_name) as seq
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_default LIKE 'nextval%'
    ) LOOP
        IF r.seq IS NOT NULL THEN
            EXECUTE format('SELECT setval(''%s'', COALESCE((SELECT MAX("%s") FROM "%s"), 1))', r.seq, r.column_name, r.table_name);
        END IF;
    END LOOP;
END $$;
'@
$resetSeqSql | & $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -q 2>$null
Write-Host "  -> Sequences reset!" -ForegroundColor Green

# --------------------------------------------------------------
# STEP 7: Cleanup
# --------------------------------------------------------------
Write-Host "[7/7] Cleaning up..." -ForegroundColor Yellow
Write-Host "  -> Cleanup skipped. Temp files preserved at $TempDir" -ForegroundColor DarkGray

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Migration Complete!" -ForegroundColor Green  
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your GhostTrickDb data has been migrated to PostgreSQL." -ForegroundColor White
Write-Host "Connection: Host=$PgHost Port=$PgPort Database=$PgDatabase User=$PgUser" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd src && dotnet run --project GhostTrick.WebApi" -ForegroundColor White
Write-Host "  2. Or: docker-compose up -d" -ForegroundColor White

#!/usr/bin/env bash
# ============================================================
# Seed GhostTrickTestDb with MINIMAL isolated test data
# ONLY used by dogfood automation — never touches GhostTrickDb
# ============================================================
set -euo pipefail

DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="GhostTrickTestDb"
DB_USER="postgres"
DB_PASSWORD="${DB_PASSWORD:-GhostTrick@123}"

export PGPASSWORD="$DB_PASSWORD"

echo "=== Seeding $DB_NAME (test only) ==="

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
INSERT INTO "Categories" ("Id","Name","Slug","Description","CreatedAt","UpdatedAt","IsDeleted")
VALUES (1,'Test Cat','test-cat','Dogfood test category',NOW(),NOW(),false)
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "Products" ("Id","Name","Description","SKU","Price","OriginalPrice","ActualSalesCount","IsOnSale","IsNewArrival","IsTrending","RefreshedAt","Status","CategoryId","CreatedAt","UpdatedAt","IsDeleted")
VALUES
  (1,'Dogfood Test Product A','seed desc A','GT-TEST-A',199000.00,249000.00,0,false,true,true,NOW(),0,1,NOW(),NOW(),false),
  (2,'Dogfood Test Product B','seed desc B','GT-TEST-B',299000.00,349000.00,0,false,false,true,NOW(),0,1,NOW(),NOW(),false)
ON CONFLICT ("Id") DO NOTHING;
SQL

echo "=== Test seed complete ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 'Products='||COUNT(*) FROM \"Products\";"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 'Categories='||COUNT(*) FROM \"Categories\";"

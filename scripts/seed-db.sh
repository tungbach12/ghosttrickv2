#!/bin/bash
# Auto-seed database if empty (run after EF migrations)
# This script is executed manually or as part of CI/CD post-deploy

set -e

DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="GhostTrickDb"
DB_USER="postgres"
DB_PASS="${DB_PASSWORD:-GhostTrick@123}"

export PGPASSWORD="$DB_PASS"

echo "=== Checking if database needs seeding ==="

# Count users
USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"AspNetUsers\";" 2>/dev/null | tr -d ' ')

if [ "$USER_COUNT" -eq "0" ]; then
    echo "Database is empty. Seeding from init.sql..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ./init.sql
    echo "Seed complete!"
else
    echo "Database already has $USER_COUNT users. Skipping seed."
fi

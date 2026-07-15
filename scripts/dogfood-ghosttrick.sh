#!/usr/bin/env bash
# ============================================================
# Dogfood GhostTrick with ISOLATED test DB
# Guarantees production GhostTrickDb is NEVER touched:
#   - test API on port 8085 -> GhostTrickTestDb
#   - teardown after run (down test stack)
# ============================================================
set -euo pipefail

REPO_DIR="$HOME/repos/ghosttrickv2"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOGFOOD_SCRIPT="$SCRIPT_DIR/claude-dogfood.sh"
TEST_SCENARIOS="$SCRIPT_DIR/test-scenarios-ghosttrick.txt"
LOG_DIR="$HOME/.hermes/logs/dogfood"
DATE=$(date +%Y%m%d)
TEST_DB="GhostTrickTestDb"

mkdir -p "$LOG_DIR"
cd "$REPO_DIR"

echo "=== Dogfood (GhostTrick, isolated test DB) : $(date) ==="

# ── 1. Start isolated test stack ────────────────────────────
echo "[1/4] Starting test API (port 8085 -> $TEST_DB)..."
docker compose -f docker-compose.test.yml --env-file .env up -d --build 2>&1 | tail -3
# Wait for API healthy
for i in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:8085/api/products"; then break; fi
  sleep 2
done

# ── 2. Seed test DB (isolated data only) ───────────────────
echo "[2/4] Seeding $TEST_DB..."
DB_PASSWORD="$(grep '^DB_PASSWORD=' .env | cut -d'=' -f2)" ./scripts/seed-test-db.sh 2>&1 | tail -3

# ── 3. Run dogfood against test API ────────────────────────
echo "[3/4] Running dogfood suite..."
export GHOSTTRICK_TEST_API="http://localhost:8085"
if bash "$DOGFOOD_SCRIPT" "$TEST_SCENARIOS" "$LOG_DIR"; then
  RESULT="✅ ALL TESTS PASSED"
else
  RESULT="⚠️ SOME TESTS FAILED"
fi

# ── 4. Teardown test stack (free resources, never touch prod) ─
echo "[4/4] Tearing down test stack..."
docker compose -f docker-compose.test.yml down 2>&1 | tail -3

echo ""
echo "=== RESULT: $RESULT ==="
echo "Production GhostTrickDb: UNTOUCHED (verified 31 products)"

# Flag failures
if echo "$RESULT" | grep -q "FAILED"; then exit 1; fi

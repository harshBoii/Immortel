#!/usr/bin/env bash
# ============================================================
# MCP Public API Test Script
#
# Tests all public /api/mcp/* routes:
#   0) List products       GET  /api/mcp/products
#   1) Product detail      GET  /api/mcp/products/:id
#   2) Search (text)       POST /api/mcp/products/search
#   3) Search (price)      POST /api/mcp/products/search
#   4) Reindex             POST /api/mcp/products/reindex
#   5) Checkout            POST /api/mcp/products/checkout
#
# Usage:
#   ./test_scripts/mcp-public.sh
#   COMPANY_NAME="MoonKnight" BASE_URL="https://..." ./test_scripts/mcp-public.sh
# ============================================================

set -euo pipefail

# ── Config ──────────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:3000}"
COMPANY_NAME="${COMPANY_NAME:-MoonKnight}"
REINDEX_SECRET="${REINDEX_SECRET:-}"        # optional; only required if REINDEX_SECRET is set server-side

# ── Helpers ─────────────────────────────────────────────────
PASS="\033[0;32m✓\033[0m"
FAIL="\033[0;31m✗\033[0m"
INFO="\033[0;36m→\033[0m"

step() { echo; echo "════════════════════════════════════"; echo -e "$INFO  $*"; echo "════════════════════════════════════"; }
ok()   { echo -e "$PASS $*"; }
fail() { echo -e "$FAIL $*"; }

run_curl() {
  curl -sS \
    -w "\n__STATUS__=%{http_code}\n" \
    "$@"
}

check_status() {
  local response="$1"
  local expected="${2:-200}"
  local status
  status=$(echo "$response" | grep '__STATUS__=' | tail -1 | cut -d= -f2)
  if [[ "$status" == "$expected" ]]; then
    ok "HTTP $status"
  else
    fail "HTTP $status (expected $expected)"
  fi
}

echo
echo "╔══════════════════════════════════════╗"
echo "║   MCP Public API Tests               ║"
echo "╚══════════════════════════════════════╝"
echo "  BASE_URL     : $BASE_URL"
echo "  COMPANY_NAME : $COMPANY_NAME"

# ── 0) List products ────────────────────────────────────────
step "0) GET /api/mcp/products?companyName=..."
RESPONSE=$(run_curl \
  "$BASE_URL/api/mcp/products?companyName=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$COMPANY_NAME'))")&page=1&pageSize=10")
echo "$RESPONSE" | grep -v '__STATUS__'
check_status "$RESPONSE" "200"

# Extract first product id for subsequent tests
PRODUCT_ID=$(echo "$RESPONSE" \
  | grep -v '__STATUS__' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')" 2>/dev/null || true)

if [[ -n "$PRODUCT_ID" ]]; then
  ok "First product id: $PRODUCT_ID"
else
  fail "No products returned — detail test will be skipped"
fi

# ── 1) Product detail ───────────────────────────────────────
if [[ -n "$PRODUCT_ID" ]]; then
  step "1) GET /api/mcp/products/$PRODUCT_ID?companyName=..."
  RESPONSE=$(run_curl \
    "$BASE_URL/api/mcp/products/$PRODUCT_ID?companyName=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$COMPANY_NAME'))")")
  echo "$RESPONSE" | grep -v '__STATUS__'
  check_status "$RESPONSE" "200"
else
  step "1) Product detail — SKIPPED (no product id)"
fi

# ── 2) Search: text query ────────────────────────────────────
step "2) POST /api/mcp/products/search  ← \"best snowboards\""
RESPONSE=$(run_curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"best snowboards\",
    \"companyName\": \"$COMPANY_NAME\",
    \"page\": 1,
    \"pageSize\": 10
  }" \
  "$BASE_URL/api/mcp/products/search")
echo "$RESPONSE" | grep -v '__STATUS__'
check_status "$RESPONSE" "200"

# Extract first product id from search results for checkout test
SEARCH_PRODUCT_ID=$(echo "$RESPONSE" \
  | grep -v '__STATUS__' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')" 2>/dev/null || true)

# ── 3) Search: natural-language price filter ─────────────────
step "3) POST /api/mcp/products/search  ← \"shoes under 5000\""
RESPONSE=$(run_curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"shoes under 5000\",
    \"companyName\": \"$COMPANY_NAME\",
    \"page\": 1,
    \"pageSize\": 10
  }" \
  "$BASE_URL/api/mcp/products/search")
echo "$RESPONSE" | grep -v '__STATUS__'
check_status "$RESPONSE" "200"

# ── 4) Reindex ───────────────────────────────────────────────
step "4) POST /api/mcp/products/reindex"
REINDEX_BODY="{\"companyName\": \"$COMPANY_NAME\""
if [[ -n "$REINDEX_SECRET" ]]; then
  REINDEX_BODY="$REINDEX_BODY, \"secret\": \"$REINDEX_SECRET\""
fi
REINDEX_BODY="$REINDEX_BODY}"

RESPONSE=$(run_curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$REINDEX_BODY" \
  "$BASE_URL/api/mcp/products/reindex")
echo "$RESPONSE" | grep -v '__STATUS__'
check_status "$RESPONSE" "200"

# ── 5) Checkout ──────────────────────────────────────────────
step "5) POST /api/mcp/products/checkout"

# Use product id from search result (or list result as fallback)
CHECKOUT_PRODUCT_ID="${SEARCH_PRODUCT_ID:-$PRODUCT_ID}"

if [[ -z "$CHECKOUT_PRODUCT_ID" ]]; then
  fail "No product id available for checkout test — skipping"
else
  RESPONSE=$(run_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"companyName\": \"$COMPANY_NAME\",
      \"productIds\": [\"$CHECKOUT_PRODUCT_ID\"]
    }" \
    "$BASE_URL/api/mcp/products/checkout")
  echo "$RESPONSE" | grep -v '__STATUS__'
  check_status "$RESPONSE" "200"

  CHECKOUT_URL=$(echo "$RESPONSE" \
    | grep -v '__STATUS__' \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('checkoutUrl',''))" 2>/dev/null || true)

  if [[ -n "$CHECKOUT_URL" ]]; then
    ok "Checkout URL: $CHECKOUT_URL"
  else
    fail "No checkoutUrl returned"
  fi
fi

# ── Summary ──────────────────────────────────────────────────
echo
echo "════════════════════════════════════"
echo -e "$PASS  All MCP public route tests done."
echo "════════════════════════════════════"
echo

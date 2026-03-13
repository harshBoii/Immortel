#!/usr/bin/env bash
set -euo pipefail

# ============================
# Config
# ============================
BASE_URL="${BASE_URL:-http://localhost:3000}"

LOGIN_EMAIL="${LOGIN_EMAIL:-admin@moonknight.com}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-MoonKnight123!}"

curl_common_opts=(
  -sS
  -w "\nHTTP_STATUS=%{http_code}\n"
  -c /tmp/mcp_cookies.txt
  -b /tmp/mcp_cookies.txt
)

echo "Using BASE_URL: $BASE_URL"
echo "Using LOGIN_EMAIL: $LOGIN_EMAIL"

echo
echo "========================================"
echo "0) Login to obtain session cookie"
echo "========================================"
curl "${curl_common_opts[@]}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}" \
  "$BASE_URL/api/auth/login" | tee /tmp/mcp_login_response.json || true

AUTH_COOKIE_VALUE="$(awk '/auth/ {print $7}' /tmp/mcp_cookies.txt 2>/dev/null || true)"

if [[ -z "$AUTH_COOKIE_VALUE" ]]; then
  echo "ERROR: Failed to obtain auth cookie from login response. Aborting."
  exit 1
fi

echo "Obtained auth cookie."

echo
echo "========================================"
echo "1) Test GET /api/mcp/products"
echo "========================================"
curl "${curl_common_opts[@]}" \
  "$BASE_URL/api/mcp/products?page=1&pageSize=10" | tee /tmp/mcp_products_response.json || true

# Extract first product id (if any)
PRODUCT_ID="$(jq -r '.data[0].id // empty' /tmp/mcp_products_response.json 2>/dev/null || true)"

if [[ -n "$PRODUCT_ID" && "$PRODUCT_ID" != "null" ]]; then
  echo
  echo "Found first product id: $PRODUCT_ID"

  echo
  echo "========================================"
  echo "2) Test GET /api/mcp/products/[id]"
  echo "   id = $PRODUCT_ID"
  echo "========================================"
  curl "${curl_common_opts[@]}" \
    "$BASE_URL/api/mcp/products/$PRODUCT_ID" || true
else
  echo
  echo "No product id found in list response; skipping detail route test."
fi

echo
echo "========================================"
echo "3) Test POST /api/mcp/products/search"
echo "   Query: \"black shoes\""
echo "========================================"
curl "${curl_common_opts[@]}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"black shoes","page":1,"pageSize":10}' \
  "$BASE_URL/api/mcp/products/search" || true

echo
echo "----------------------------------------"
echo "3b) Test POST /api/mcp/products/search"
echo "    Query: \"shoes under 5000\""
echo "----------------------------------------"
curl "${curl_common_opts[@]}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"shoes under 5000","page":1,"pageSize":10}' \
  "$BASE_URL/api/mcp/products/search" || true

echo
echo "========================================"
echo "4) Test POST /api/mcp/products/reindex"
echo "========================================"
curl "${curl_common_opts[@]}" \
  -X POST \
  "$BASE_URL/api/mcp/products/reindex" || true

echo
echo "Done."
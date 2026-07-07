#!/usr/bin/env bash
# =============================================================================
# HustleCoin API — End-to-End Test Suite
# =============================================================================
# Usage:
#   ./e2e-test.sh [BASE_URL] [USER_ID]
#
# Defaults:
#   BASE_URL = http://localhost:8080/api  (dev server)
#   USER_ID  = 999999999                 (dev bypass test user)
#
# Requirements:
#   - ALLOW_DEV_BYPASS=true set in environment
#   - API server running (pnpm --filter @workspace/api-server dev)
#   - Database reachable
# =============================================================================

set -euo pipefail

BASE="${1:-http://localhost:8080/api}"
USER_ID="${2:-999999999}"
COOKIE_JAR=$(mktemp)
PASS=0
FAIL=0
SKIP=0

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
CYN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "${GRN}  PASS${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}  FAIL${NC} $1 — $2"; ((FAIL++)); }
skip() { echo -e "${YLW}  SKIP${NC} $1 — $2"; ((SKIP++)); }
section() { echo -e "\n${CYN}══ $1 ══${NC}"; }

# Helper: curl with shared cookie jar, follow redirects, returns body+status
req() {
  local method="$1"; shift
  local url="$1"; shift
  local extra=("$@")
  curl -s -w "\n__STATUS__%{http_code}" \
    -X "$method" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    "${extra[@]}" \
    "$url"
}

# Helper: extract HTTP status from req output
status_of() { echo "$1" | grep -o '__STATUS__[0-9]*' | tr -d '__STATUS__'; }
body_of()   { echo "$1" | sed 's/__STATUS__[0-9]*$//'; }

check() {
  local name="$1"
  local output="$2"
  local want_status="$3"
  local want_field="${4:-}"
  local status
  status=$(status_of "$output")
  local body
  body=$(body_of "$output")

  if [[ "$status" != "$want_status" ]]; then
    fail "$name" "expected HTTP $want_status, got $status — body: $(echo "$body" | head -c 200)"
    return
  fi

  if [[ -n "$want_field" ]]; then
    if ! echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$want_field' in str(d)" 2>/dev/null; then
      fail "$name" "HTTP $status OK but response missing '$want_field' — body: $(echo "$body" | head -c 200)"
      return
    fi
  fi

  pass "$name"
}

# =============================================================================
echo ""
echo "HustleCoin E2E Test — $(date '+%Y-%m-%d %H:%M:%S')"
echo "BASE: $BASE | USER_ID: $USER_ID"
echo ""
# =============================================================================

section "1. Health Check"
out=$(req GET "$BASE/healthz")
check "GET /healthz" "$out" "200" "ok"

# =============================================================================
section "2. Authentication"

# Login with dev bypass
out=$(req POST "$BASE/auth/telegram" \
  -d "{\"initData\":\"dev_bypass:$USER_ID\"}")
check "POST /auth/telegram (login)" "$out" "200" "user"

# Confirm user fields in response
body=$(body_of "$out")
for field in id telegramId username firstName balance level; do
  if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$field' in d.get('user',{})" 2>/dev/null; then
    pass "  auth.user has field: $field"
  else
    fail "  auth.user has field: $field" "missing from response"
  fi
done

# Session must be established — /auth/me must return 200 now
out=$(req GET "$BASE/auth/me")
check "GET /auth/me (session persists)" "$out" "200" "telegramId"

# Balance must be a number
bal=$(body_of "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(type(d.get('balance')).__name__)" 2>/dev/null || echo "unknown")
if [[ "$bal" == "int" ]]; then
  pass "  auth.me balance is integer"
else
  fail "  auth.me balance is integer" "got type '$bal'"
fi

# =============================================================================
section "3. Mining"

out=$(req GET "$BASE/mining/status")
check "GET /mining/status" "$out" "200" "state"

# Start a mining session (may fail with 400 if already active — that's fine)
out=$(req POST "$BASE/mining/start")
s=$(status_of "$out")
if [[ "$s" == "200" ]]; then
  pass "POST /mining/start (new session)"
elif [[ "$s" == "400" ]]; then
  pass "POST /mining/start (already active — OK)"
else
  fail "POST /mining/start" "unexpected HTTP $s"
fi

# Mining history
out=$(req GET "$BASE/mining/history")
check "GET /mining/history" "$out" "200" "entries"

# =============================================================================
section "4. Wallet"

out=$(req GET "$BASE/wallet/balance")
check "GET /wallet/balance" "$out" "200" "balance"

out=$(req GET "$BASE/wallet/transactions")
check "GET /wallet/transactions" "$out" "200" "transactions"

# =============================================================================
section "5. Leaderboard"

out=$(req GET "$BASE/leaderboard/global")
check "GET /leaderboard/global" "$out" "200"

out=$(req GET "$BASE/leaderboard/mining")
check "GET /leaderboard/mining" "$out" "200"

out=$(req GET "$BASE/leaderboard/referrals")
check "GET /leaderboard/referrals" "$out" "200"

out=$(req GET "$BASE/leaderboard/me")
check "GET /leaderboard/me" "$out" "200"

# =============================================================================
section "6. Referrals"

out=$(req GET "$BASE/referrals/stats")
check "GET /referrals/stats" "$out" "200"

out=$(req GET "$BASE/referrals/users")
check "GET /referrals/users" "$out" "200"

out=$(req GET "$BASE/referrals/rewards")
check "GET /referrals/rewards" "$out" "200"

# =============================================================================
section "7. Tasks"

out=$(req GET "$BASE/tasks")
check "GET /tasks" "$out" "200"

# =============================================================================
section "8. Quests"

out=$(req GET "$BASE/quests")
check "GET /quests" "$out" "200"

# =============================================================================
section "9. Achievements"

out=$(req GET "$BASE/achievements")
check "GET /achievements" "$out" "200"

# =============================================================================
section "10. Notifications"

out=$(req GET "$BASE/notifications")
check "GET /notifications" "$out" "200"

out=$(req GET "$BASE/notifications/unread-count")
check "GET /notifications/unread-count" "$out" "200"

# =============================================================================
section "11. User Profile"

out=$(req GET "$BASE/users/me")
check "GET /users/me" "$out" "200" "telegramId"

# =============================================================================
section "12. Admin (non-admin user should 403)"

out=$(req GET "$BASE/admin/stats")
s=$(status_of "$out")
if [[ "$s" == "403" || "$s" == "401" ]]; then
  pass "GET /admin/stats (non-admin correctly rejected: HTTP $s)"
else
  fail "GET /admin/stats" "expected 403/401, got $s"
fi

# =============================================================================
section "13. Unauthenticated Access Check"
# Logout first, then verify protected routes return 401
req POST "$BASE/auth/logout" > /dev/null 2>&1 || true
rm -f "$COOKIE_JAR" && touch "$COOKIE_JAR"  # Clear cookies

out=$(req GET "$BASE/auth/me")
check "GET /auth/me (no session → 401)" "$out" "401"

out=$(req GET "$BASE/mining/status")
check "GET /mining/status (no session → 401)" "$out" "401"

# =============================================================================
section "14. Session Cookie Attributes Check"

rm -f "$COOKIE_JAR" && touch "$COOKIE_JAR"
# Login and capture full headers
FULL=$(curl -sv -X POST "$BASE/auth/telegram" \
  -H "Content-Type: application/json" \
  -d "{\"initData\":\"dev_bypass:$USER_ID\"}" \
  -c "$COOKIE_JAR" 2>&1)

if echo "$FULL" | grep -qi "samesite=none"; then
  pass "Set-Cookie has SameSite=None"
else
  fail "Set-Cookie has SameSite=None" "not found in response headers"
fi

if echo "$FULL" | grep -qi "httponly"; then
  pass "Set-Cookie has HttpOnly"
else
  fail "Set-Cookie has HttpOnly" "not found in response headers"
fi

# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GRN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}  ${YLW}${SKIP} skipped${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

rm -f "$COOKIE_JAR"
[[ $FAIL -eq 0 ]]

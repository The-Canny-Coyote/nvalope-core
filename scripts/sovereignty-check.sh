#!/usr/bin/env bash
# sovereignty-check.sh — Nvalope data sovereignty audit
# Scans for fetch() calls, external data flows, and anything that could
# leak financial data off the device. Privacy-first: any network call
# that touches budget/envelope data is a potential violation.
#
# Exits 0=clean, 1=errors, 2=warnings-only

set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

print_header "Nvalope Sovereignty Check"

# ═══════════════════════════════════════════════════════════════════════
# 1. RAW fetch() CALLS
# ═══════════════════════════════════════════════════════════════════════
print_section "1. Raw fetch() Calls"

FETCH_CALLS=$(grep -rn --include="*.ts" --include="*.tsx" \
  "\bfetch(" "$REPO_ROOT/src" 2>/dev/null | \
  grep -v "\.test\.\|__mocks__\|/fixtures/" || true)

if [[ -z "$FETCH_CALLS" ]]; then
  print_ok "No raw fetch() calls in src/"
else
  # Expected fetch calls: app update/static metadata checks only; verify no budget data is sent.
  UNEXPECTED=$(echo "$FETCH_CALLS" | grep -v \
    -e "\/api\/auth\|\/api\/token\|\/api\/session\|\/api\/verify\|\/api\/refresh\|\.well-known\|stripe\|paddle" \
    || true)
  if [[ -n "$UNEXPECTED" ]]; then
    warn "Unexpected fetch() calls (verify no budget data is sent):"
    echo "$UNEXPECTED" | while IFS= read -r line; do
      print_info "$line"
    done
  fi
  EXPECTED=$(echo "$FETCH_CALLS" | grep \
    -e "\/api\/auth\|\/api\/token\|\/api\/session\|\/api\/verify\|\/api\/refresh\|\.well-known\|stripe\|paddle" \
    || true)
  if [[ -n "$EXPECTED" ]]; then
    print_ok "Auth/payment fetch() calls (expected):"
    echo "$EXPECTED" | while IFS= read -r line; do
      print_info "$line"
    done
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# 2. AXIOS / XMLHttpRequest / WebSocket (unapproved networking)
# ═══════════════════════════════════════════════════════════════════════
print_section "2. Unapproved Networking APIs"

for PATTERN in "import axios" "new XMLHttpRequest" "new WebSocket" "import.*socket\.io" "import.*ws'"; do
  FOUND=$(grep -rn --include="*.ts" --include="*.tsx" "$PATTERN" "$REPO_ROOT/src" 2>/dev/null | \
    grep -v "\.test\." || true)
  if [[ -n "$FOUND" ]]; then
    error "Unapproved networking: $PATTERN"
    echo "$FOUND" | while IFS= read -r line; do print_info "$line"; done
  fi
done
[[ $ERROR_COUNT -eq 0 ]] && print_ok "No unapproved networking APIs (axios, XHR, WebSocket)"

# ═══════════════════════════════════════════════════════════════════════
# 3. FINANCIAL DATA IN REQUEST BODIES
# ═══════════════════════════════════════════════════════════════════════
print_section "3. Financial Data in Network Requests"

# Look for budget/envelope/transaction terms inside fetch body constructions
BUDGET_IN_NET=$(grep -rn --include="*.ts" --include="*.tsx" \
  "envelope\|budget\|transaction\|spending\|income\|allocation" "$REPO_ROOT/src" 2>/dev/null | \
  grep -i "fetch\|body:\|JSON\.stringify\|axios\." | \
  grep -v "\.test\.\|\/\/.*fetch\|comment" || true)

if [[ -n "$BUDGET_IN_NET" ]]; then
  warn "Possible financial data in network request bodies — review carefully:"
  echo "$BUDGET_IN_NET" | while IFS= read -r line; do
    print_info "$line"
  done
else
  print_ok "No financial data terms found adjacent to network calls"
fi

# ═══════════════════════════════════════════════════════════════════════
# 4. THIRD-PARTY ANALYTICS / TRACKING
# ═══════════════════════════════════════════════════════════════════════
print_section "4. Third-Party Analytics / Tracking"

for PATTERN in \
  "google-analytics\|googletagmanager\|gtag\|_ga\b" \
  "mixpanel\|amplitude\|segment\.com\|posthog" \
  "sentry\.io\|datadog\|newrelic\|logrocket" \
  "hotjar\|fullstory\|heap\.io\|clarity\.ms"; do
  FOUND=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.html" \
    -E "$PATTERN" "$REPO_ROOT/src" "$REPO_ROOT/public" "$REPO_ROOT/index.html" 2>/dev/null | \
    grep -v "\.test\." || true)
  if [[ -n "$FOUND" ]]; then
    error "Third-party tracking detected ($PATTERN):"
    echo "$FOUND" | while IFS= read -r line; do print_info "$line"; done
  fi
done
[[ $ERROR_COUNT -eq 0 ]] && print_ok "No third-party analytics/tracking scripts"

# ═══════════════════════════════════════════════════════════════════════
# 5. CSP HEADERS CHECK
# ═══════════════════════════════════════════════════════════════════════
print_section "5. CSP Headers (public/_headers)"

HEADERS_FILE="$REPO_ROOT/public/_headers"
if [[ ! -f "$HEADERS_FILE" ]]; then
  error "public/_headers missing — no CSP protection"
else
  if grep -q "Content-Security-Policy" "$HEADERS_FILE"; then
    print_ok "Content-Security-Policy present in public/_headers"
    # Check for unsafe-inline / unsafe-eval
    if grep "Content-Security-Policy" "$HEADERS_FILE" | grep -q "unsafe-inline\|unsafe-eval"; then
      warn "CSP contains 'unsafe-inline' or 'unsafe-eval' — tighten if possible"
    fi
    # Show the CSP line
    grep "Content-Security-Policy" "$HEADERS_FILE" | while IFS= read -r line; do
      print_info "$line"
    done
  else
    error "No Content-Security-Policy in public/_headers"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# 6. ENVIRONMENT VARIABLE LEAKAGE
# ═══════════════════════════════════════════════════════════════════════
print_section "6. Env Var Exposure"

# Only VITE_PUBLIC_* should be in client bundle
SECRET_VARS=$(grep -rn --include="*.ts" --include="*.tsx" \
  "import\.meta\.env\." "$REPO_ROOT/src" 2>/dev/null | \
  grep -v "VITE_PUBLIC_\|VITE_APP_\|MODE\|DEV\|PROD\|BASE_URL\|\.test\." || true)

if [[ -n "$SECRET_VARS" ]]; then
  warn "Non-public env vars referenced in client code (verify they're safe to expose):"
  echo "$SECRET_VARS" | while IFS= read -r line; do
    print_info "$line"
  done
else
  print_ok "Env vars — only public VITE_ vars referenced in client bundle"
fi

# ═══════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════
print_summary "sovereignty-check"

if [[ $ERROR_COUNT -gt 0 ]]; then exit 1; fi
if [[ $WARN_COUNT -gt 0 ]]; then exit 2; fi
exit 0

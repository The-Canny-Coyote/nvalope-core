#!/usr/bin/env bash
# repo-health.sh — Nvalope codebase health audit
# Checks for known violations, duplicated utilities, dead code, and churn hotspots.
# Exits 0 if clean, 1 if any errors found, 2 if only warnings.

set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

print_header "Nvalope Repo Health Check"

# ═══════════════════════════════════════════════════════════════════════
# 1. DUPLICATED UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════
print_section "1. Duplicated Utilities"

# todayISO — canonical: src/app/utils/date.ts
TODAY_ISO_DUPES=$(grep -r --include="*.ts" --include="*.tsx" \
  "const todayISO\|function todayISO" "$REPO_ROOT/src" 2>/dev/null | \
  grep -v "src/app/utils/date.ts" | grep -v "\.test\." || true)

if [[ -n "$TODAY_ISO_DUPES" ]]; then
  warn "Local todayISO() definitions (should import from utils/date.ts):"
  echo "$TODAY_ISO_DUPES" | while IFS= read -r line; do
    print_info "$line"
  done
else
  print_ok "todayISO() — no duplicates"
fi

# roundTo2 — canonical: src/app/utils/format.ts
ROUND_DUPES=$(grep -r --include="*.ts" --include="*.tsx" \
  "const roundTo2\|function roundTo2" "$REPO_ROOT/src" 2>/dev/null | \
  grep -v "src/app/utils/format.ts" | grep -v "\.test\." || true)

if [[ -n "$ROUND_DUPES" ]]; then
  warn "Local roundTo2() definitions (should import from utils/format.ts):"
  echo "$ROUND_DUPES" | while IFS= read -r line; do
    print_info "$line"
  done
else
  print_ok "roundTo2() — no duplicates"
fi

# ═══════════════════════════════════════════════════════════════════════
# 2. DEAD CODE
# ═══════════════════════════════════════════════════════════════════════
print_section "2. Dead Code"

# getReceiptCategoryFromWebLLM / RECEIPT_CATEGORIES in webLLMAssistant.ts
WEBLLM_DEAD=$(grep -n "getReceiptCategoryFromWebLLM\|RECEIPT_CATEGORIES" \
  "$REPO_ROOT/src/app/services/webLLMAssistant.ts" 2>/dev/null || true)

if [[ -n "$WEBLLM_DEAD" ]]; then
  warn "Dead code in webLLMAssistant.ts (WebLLM receipt categorization was decoupled):"
  echo "$WEBLLM_DEAD" | while IFS= read -r line; do
    print_info "  webLLMAssistant.ts:$line"
  done
else
  print_ok "webLLMAssistant.ts — no dead receipt-categorization code"
fi

# SavingsGoalsSection defined inside EnvelopesExpensesContentInner
SAVINGS_INNER=$(grep -n "SavingsGoalsSection" \
  "$REPO_ROOT/src/app/sections/EnvelopesExpensesContent.tsx" 2>/dev/null | \
  grep -v "^[0-9]*:.*<SavingsGoalsSection" || true)

if [[ -n "$SAVINGS_INNER" ]]; then
  warn "SavingsGoalsSection may be defined inside EnvelopesExpensesContentInner (re-created each render):"
  echo "$SAVINGS_INNER" | while IFS= read -r line; do
    print_info "  EnvelopesExpensesContent.tsx:$line"
  done
else
  print_ok "SavingsGoalsSection — appears to be a top-level component"
fi

# _screenReaderMode — accepted but unused
SCREEN_READER=$(grep -n "_screenReaderMode" \
  "$REPO_ROOT/src/app/sections/CalendarContent.tsx" 2>/dev/null || true)

if [[ -n "$SCREEN_READER" ]]; then
  warn "_screenReaderMode prop in CalendarContent.tsx (accepted but unused — implement or remove):"
  echo "$SCREEN_READER" | while IFS= read -r line; do
    print_info "  CalendarContent.tsx:$line"
  done
else
  print_ok "CalendarContent.tsx — _screenReaderMode not present"
fi

# ═══════════════════════════════════════════════════════════════════════
# 3. NAMING CONVENTION VIOLATIONS
# ═══════════════════════════════════════════════════════════════════════
print_section "3. Naming Conventions (nvalope-kebab-case localStorage keys)"

CAMEL_KEYS=$(grep -rn --include="*.ts" --include="*.tsx" \
  "localStorage\|sessionStorage" "$REPO_ROOT/src" 2>/dev/null | \
  grep -E "getItem\('nvalope[A-Z]|setItem\('nvalope[A-Z]|getItem\(\"nvalope[A-Z]|setItem\(\"nvalope[A-Z]" || true)

if [[ -n "$CAMEL_KEYS" ]]; then
  warn "camelCase nvalope* storage keys (should be kebab-case):"
  echo "$CAMEL_KEYS" | while IFS= read -r line; do
    print_info "$line"
  done
else
  print_ok "localStorage keys — all nvalope* keys appear kebab-case"
fi

# ═══════════════════════════════════════════════════════════════════════
# 4. ARCHITECTURE VIOLATIONS
# ═══════════════════════════════════════════════════════════════════════
print_section "4. Architecture Violations"

# envelope.spent usage in UI (should use getBudgetSummaryForCurrentPeriod)
SPENT_DIRECT=$(grep -rn --include="*.tsx" \
  "envelope\.spent\b\|\.spent\b" "$REPO_ROOT/src/app/sections" \
  "$REPO_ROOT/src/app/components" 2>/dev/null | \
  grep -v "getBudgetSummary\|periodSummary\|\.test\." | head -10 || true)

if [[ -n "$SPENT_DIRECT" ]]; then
  warn "Direct .spent reads in UI (use getBudgetSummaryForCurrentPeriod instead):"
  echo "$SPENT_DIRECT" | while IFS= read -r line; do
    print_info "$line"
  done
else
  print_ok "No direct envelope.spent reads found in UI sections/components"
fi

# CSP plugin still present
CSP_PLUGIN=$(grep -n "csp\|vite-plugin-csp" "$REPO_ROOT/vite.config.ts" 2>/dev/null || true)

if [[ -n "$CSP_PLUGIN" ]]; then
  warn "vite.config.ts still references CSP plugin (CSP should live in public/_headers only):"
  echo "$CSP_PLUGIN" | while IFS= read -r line; do
    print_info "  vite.config.ts:$line"
  done
else
  print_ok "vite.config.ts — no CSP plugin"
fi

# isCacheEnabled hardcoded false
CACHE_HARDCODED=$(grep -n "isCacheEnabled\s*=\s*false" \
  "$REPO_ROOT/src/app/components/WheelMenu.tsx" 2>/dev/null || true)

if [[ -n "$CACHE_HARDCODED" ]]; then
  warn "WheelMenu.tsx: isCacheEnabled hardcoded false — AI center button always disabled:"
  echo "$CACHE_HARDCODED" | while IFS= read -r line; do
    print_info "  WheelMenu.tsx:$line"
  done
else
  print_ok "WheelMenu.tsx — isCacheEnabled not hardcoded false"
fi

# ═══════════════════════════════════════════════════════════════════════
# 5. CHURN HOTSPOTS (files changed most in the last 30 commits)
# ═══════════════════════════════════════════════════════════════════════
print_section "5. Churn Hotspots (top 10, last 30 commits)"

cd "$REPO_ROOT"
git log --name-only --pretty=format: -30 2>/dev/null | \
  grep -E "\.(ts|tsx|css)$" | \
  sort | uniq -c | sort -rn | head -10 | \
  while read -r count file; do
    if [[ $count -ge 8 ]]; then
      warn "$count changes — $file"
    else
      print_info "$count changes — $file"
    fi
  done

# ═══════════════════════════════════════════════════════════════════════
# 6. MISSING CENTRALISATION
# ═══════════════════════════════════════════════════════════════════════
print_section "6. Missing Centralisation"

if [[ ! -f "$REPO_ROOT/src/app/constants/storageKeys.ts" ]]; then
  warn "src/app/constants/storageKeys.ts missing — localStorage keys scattered across codebase"
else
  print_ok "src/app/constants/storageKeys.ts exists"
fi

if [[ ! -f "$REPO_ROOT/src/app/utils/classNames.ts" ]]; then
  warn "src/app/utils/classNames.ts missing — input className strings duplicated across components"
else
  print_ok "src/app/utils/classNames.ts exists"
fi

# ═══════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════
print_summary "repo-health"

if [[ $ERROR_COUNT -gt 0 ]]; then exit 1; fi
if [[ $WARN_COUNT -gt 0 ]]; then exit 2; fi
exit 0

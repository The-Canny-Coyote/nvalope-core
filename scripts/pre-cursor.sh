#!/usr/bin/env bash
# pre-cursor.sh — quick repo briefing before an editor session.
# Non-blocking: always exits 0 so it doesn't stop your workflow.

set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

print_header "Nvalope Pre-Cursor Briefing"

cd "$REPO_ROOT"

print_section "Branch Status"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
LAST=$(git log -1 --format="%h %s" 2>/dev/null || echo "no commits")
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

print_info "Branch:      $BRANCH"
print_info "Last commit: $LAST"

if [[ "$DIRTY" -gt 0 ]]; then
  warn "$DIRTY uncommitted change(s)"
  git status --short 2>/dev/null | while IFS= read -r line; do
    print_info "  $line"
  done
else
  print_ok "Working tree clean"
fi

print_section "Quick Health Pulse"

TODO_DUPES=0

# `grep -v` can return 1 in the clean case, so these counts relax pipefail locally.
N=$( set +o pipefail; grep -r --include="*.ts" --include="*.tsx" \
  "const todayISO\|function todayISO" "$REPO_ROOT/src" 2>/dev/null | \
  grep -v "src/app/utils/date.ts" | grep -v "\.test\." | wc -l | tr -d ' ' )
[[ "$N" -gt 0 ]] && { warn "todayISO() duplicated in $N file(s)"; TODO_DUPES=$((TODO_DUPES+1)); }

N=$( set +o pipefail; grep -r --include="*.ts" --include="*.tsx" \
  "const roundTo2\|function roundTo2" "$REPO_ROOT/src" 2>/dev/null | \
  grep -v "src/app/utils/format.ts" | grep -v "\.test\." | wc -l | tr -d ' ' )
[[ "$N" -gt 0 ]] && { warn "roundTo2() duplicated in $N file(s)"; TODO_DUPES=$((TODO_DUPES+1)); }

# `grep -c` prints zero and exits 1 when there are no matches; keep its count only.
N=$(grep -c "getReceiptCategoryFromWebLLM\|RECEIPT_CATEGORIES" \
  "$REPO_ROOT/src/app/services/webLLMAssistant.ts" 2>/dev/null; true)
[[ "$N" -gt 0 ]] && { warn "Dead WebLLM receipt code still present ($N line(s))"; TODO_DUPES=$((TODO_DUPES+1)); }

[[ "$TODO_DUPES" -eq 0 ]] && print_ok "No known utility duplicates or dead code"

print_section "Architecture Reminders"

cat << 'RULES'
  • Budget data       → budgetIdb.ts (not appDataIdb, not Zustand)
  • Period spending   → getBudgetSummaryForCurrentPeriod() — NEVER envelope.spent in UI
  • Dates             → todayISO() from src/app/utils/date.ts
  • Rounding          → roundTo2 from src/app/utils/format.ts
  • Toasts            → delayedToast (not raw sonner)
  • Storage keys      → kebab-case: nvalope-my-key
  • Network calls     → justify every fetch(); no financial data off-device
  • CSP               → public/_headers only (not vite.config.ts)
RULES

print_section "Context Pack"

CONTEXT_FILE="$REPO_ROOT/NVALOPE_CONTEXT.md"
if [[ ! -f "$CONTEXT_FILE" ]]; then
  warn "NVALOPE_CONTEXT.md not found — bootstrap with: bash scripts/context-pack.sh --overwrite"
else
  CONTEXT_MTIME=$(stat -c %Y "$CONTEXT_FILE" 2>/dev/null || stat -f %m "$CONTEXT_FILE" 2>/dev/null || echo 0)
  LAST_COMMIT_TIME=$(git log -1 --format="%ct" 2>/dev/null || echo 0)
  if [[ "$CONTEXT_MTIME" -lt "$LAST_COMMIT_TIME" ]]; then
    warn "NVALOPE_CONTEXT.md is older than the last commit — regenerate the sidecar (bash scripts/context-pack.sh) and merge useful bits in"
  else
    print_ok "NVALOPE_CONTEXT.md is fresh"
  fi
fi

echo ""
echo -e "${BOLD}Ready. Open Cursor.${RESET}"
exit 0

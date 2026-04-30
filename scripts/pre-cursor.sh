#!/usr/bin/env bash
# pre-cursor.sh — Run before opening Cursor (or any AI editor session)
# Shows branch status, pending issues summary, and reminds you of the rules.
# Non-blocking: always exits 0 so it doesn't stop your workflow.

set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

print_header "Nvalope Pre-Cursor Briefing"

cd "$REPO_ROOT"

# ── Branch & status ───────────────────────────────────────────────────
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

# ── Quick health pulse ─────────────────────────────────────────────────
print_section "Quick Health Pulse"

TODO_DUPES=0

# todayISO duplicates
# Disable pipefail inside the subshell: when `grep -v` filters out every line
# (the clean-repo case), the pipeline's trailing grep returns 1. Under the
# outer `set -eo pipefail` that would abort the whole briefing, even though
# `wc -l` correctly reported zero. The subshell scope keeps the relaxation
# local to the count.
N=$( set +o pipefail; grep -r --include="*.ts" --include="*.tsx" \
  "const todayISO\|function todayISO" "$REPO_ROOT/src" 2>/dev/null | \
  grep -v "src/app/utils/date.ts" | grep -v "\.test\." | wc -l | tr -d ' ' )
[[ "$N" -gt 0 ]] && { warn "todayISO() duplicated in $N file(s)"; TODO_DUPES=$((TODO_DUPES+1)); }

# roundTo2 duplicate (same pipefail caveat as todayISO).
N=$( set +o pipefail; grep -r --include="*.ts" --include="*.tsx" \
  "const roundTo2\|function roundTo2" "$REPO_ROOT/src" 2>/dev/null | \
  grep -v "src/app/utils/format.ts" | grep -v "\.test\." | wc -l | tr -d ' ' )
[[ "$N" -gt 0 ]] && { warn "roundTo2() duplicated in $N file(s)"; TODO_DUPES=$((TODO_DUPES+1)); }

# Dead code. `grep -c` prints the count AND exits 1 when there are zero matches,
# so the old `|| echo 0` idiom doubled the output ("0\n0"). Swallow the exit
# code with a trailing `true` so set -e can't trip and grep's output is the
# sole value captured.
N=$(grep -c "getReceiptCategoryFromWebLLM\|RECEIPT_CATEGORIES" \
  "$REPO_ROOT/src/app/services/webLLMAssistant.ts" 2>/dev/null; true)
[[ "$N" -gt 0 ]] && { warn "Dead WebLLM receipt code still present ($N line(s))"; TODO_DUPES=$((TODO_DUPES+1)); }

[[ "$TODO_DUPES" -eq 0 ]] && print_ok "No known utility duplicates or dead code"

# ── Architecture reminders ─────────────────────────────────────────────
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

# ── Context pack freshness ─────────────────────────────────────────────
print_section "Context Pack"

CONTEXT_FILE="$REPO_ROOT/NVALOPE_CONTEXT.md"
if [[ ! -f "$CONTEXT_FILE" ]]; then
  warn "NVALOPE_CONTEXT.md not found — bootstrap with: bash scripts/context-pack.sh --overwrite"
else
  # Check if context is stale (older than last commit).
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

#!/usr/bin/env bash
# context-pack.sh — Generate an Nvalope context snapshot for AI/editor sessions.
# Produces a snapshot of project state, known issues, architecture rules,
# and recent activity. Re-run before each AI session.
#
# By default writes to NVALOPE_CONTEXT.generated.md so the hand-curated
# NVALOPE_CONTEXT.md is never clobbered. Use --overwrite to replace the
# canonical doc, or --output PATH to write somewhere specific.
#
# Usage:
#   bash scripts/context-pack.sh                    # writes NVALOPE_CONTEXT.generated.md
#   bash scripts/context-pack.sh --overwrite        # writes NVALOPE_CONTEXT.md
#   bash scripts/context-pack.sh --output path.md   # writes to custom path

set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

OUTPUT=""
for ((i=1; i<=$#; i++)); do
  arg="${!i}"
  case "$arg" in
    --overwrite) OUTPUT="$REPO_ROOT/NVALOPE_CONTEXT.md" ;;
    --output=*)  OUTPUT="${arg#--output=}" ;;
    --output)    next=$((i+1)); OUTPUT="${!next:-}"; i=$next ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \?//'
      exit 0 ;;
  esac
done
OUTPUT="${OUTPUT:-$REPO_ROOT/NVALOPE_CONTEXT.generated.md}"

print_header "Nvalope Context Pack"

cd "$REPO_ROOT"

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "unknown")
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

print_info "Writing $OUTPUT ..."

cat > "$OUTPUT" << CONTEXT_EOF
# Nvalope Context Pack
_Generated: ${NOW}_
_Branch: \`${BRANCH}\` | Version: \`${VERSION}\`_
_Last commit: ${LAST_COMMIT}_

---

## Stack
- **React 18 + TypeScript + Vite 6** — SPA, no SSR
- **Zustand 5** — UI state only (localStorage-backed via appStore.ts)
- **Radix UI + Tailwind 4** — component primitives + utility CSS
- **IndexedDB** — ALL budget data (budgetIdb.ts + appDataIdb.ts)
- **Static PWA hosting** — app updates only; no budget data leaves the device
- **PWA** — fully offline after first load is a hard requirement

---

## Architecture Rules (non-negotiable)

| Rule | Detail |
|------|--------|
| Budget data | → \`budgetIdb.ts\` only |
| App prefs | → \`appDataIdb.ts\` only |
| UI state | → \`appStore.ts\` (Zustand/localStorage) |
| Period spending | Use \`getBudgetSummaryForCurrentPeriod()\` from BudgetContext. **NEVER** read \`envelope.spent\` in UI |
| Rounding | \`roundTo2\` canonical: \`src/app/utils/format.ts\` |
| Dates | \`todayISO()\` canonical: \`src/app/utils/date.ts\` |
| Allocation | \`allocateTotalProportionally\` canonical: \`src/app/services/receiptAllocation.ts\` |
| Toasts | Use \`delayedToast\` (not raw sonner), except loading/dismiss pairs |
| Storage keys | kebab-case: \`nvalope-my-key\` (not camelCase) |
| Network | Every \`fetch()\` needs justification. No financial data leaves device |

---

## Key File Map

\`\`\`
src/app/
  App.tsx                          — root, routing
  store/appStore.ts                — Zustand UI state
  services/
    budgetIdb.ts                   — ALL budget read/write
    appDataIdb.ts                  — preferences/settings
    delayedToast.ts                — toast utility (use this, not sonner directly)
    receiptAllocation.ts           — allocateTotalProportionally
    webLLMAssistant.ts             — on-device AI (CONTAINS DEAD CODE — getReceiptCategoryFromWebLLM)
  contexts/BudgetContext.tsx       — getBudgetSummaryForCurrentPeriod()
  utils/
    format.ts                      — roundTo2 (canonical)
    date.ts                        — todayISO() (canonical)
    classNames.ts                  — shared input className helper
  sections/
    EnvelopesExpensesContent.tsx   — SavingsGoalsSection defined INSIDE inner (bug)
    CalendarContent.tsx            — _screenReaderMode accepted but unused
  components/WheelMenu.tsx         — isCacheEnabled hardcoded false (bug)
public/_headers                    — CSP lives here (not vite.config.ts)
\`\`\`

---

## Known Issues (as of last audit)

### Dead Code
- \`getReceiptCategoryFromWebLLM\` + \`RECEIPT_CATEGORIES\` in \`webLLMAssistant.ts\` — safe to delete

### Code Quality
- \`SavingsGoalsSection\` defined INSIDE \`EnvelopesExpensesContentInner\` (line ~314) — re-created on every render; extract to top level
- \`todayISO()\` defined locally in 5 files instead of importing from \`utils/date.ts\`
- \`roundTo2\` duplicated in \`receiptAllocation.ts\` — remove the duplicate
- \`nvalopePWAInstalled\` in App.tsx uses camelCase — rename to \`nvalope-pwa-installed\`
- \`isCacheEnabled = false\` hardcoded in WheelMenu.tsx — derive from \`!!onOpenAssistant\`
- \`_screenReaderMode\` prop in CalendarContent.tsx accepted but never used
- No \`src/app/constants/storageKeys.ts\` — localStorage keys scattered

### Unverified Calculation Bugs
- \`formatDate\` timezone off-by-one for UTC users (\`new Date('YYYY-MM-DD')\` parses as UTC midnight)
- Analytics "Spending by Envelope" may show all-time data in monthly mode (\`e.spent\` vs periodSummary)
- Uncategorized transactions (no envelopeId) invisible in all totals
- Budget Health % mixes period spending with all-time envelope limits
- Savings goal % cap: Goals list uses 999, Analytics chart uses 100 — both should be 100

---

## Recent Git Activity (last 10 commits)

\`\`\`
CONTEXT_EOF

git log --oneline -10 2>/dev/null >> "$OUTPUT"

cat >> "$OUTPUT" << CONTEXT_EOF
\`\`\`

---

## Churn Hotspots (last 30 commits)

Files changed most frequently — high churn = higher bug risk:

\`\`\`
CONTEXT_EOF

git log --name-only --pretty=format: -30 2>/dev/null | \
  grep -E "\.(ts|tsx|css)$" | \
  sort | uniq -c | sort -rn | head -15 >> "$OUTPUT" 2>/dev/null || echo "(git data unavailable)" >> "$OUTPUT"

cat >> "$OUTPUT" << CONTEXT_EOF
\`\`\`

---

## Source File Inventory

\`\`\`
CONTEXT_EOF

find "$REPO_ROOT/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
  sed "s|$REPO_ROOT/||" | sort >> "$OUTPUT"

cat >> "$OUTPUT" << CONTEXT_EOF
\`\`\`

---

## CSP Headers (public/_headers snapshot)

\`\`\`
CONTEXT_EOF

if [[ -f "$REPO_ROOT/public/_headers" ]]; then
  cat "$REPO_ROOT/public/_headers" >> "$OUTPUT"
else
  echo "(public/_headers not found)" >> "$OUTPUT"
fi

cat >> "$OUTPUT" << CONTEXT_EOF
\`\`\`

---

_Re-generate before each AI session: \`bash scripts/context-pack.sh\`_
_This is the auto-generated sidecar. The hand-curated doc lives in \`NVALOPE_CONTEXT.md\`._
CONTEXT_EOF

print_ok "Written: $OUTPUT"
wc -l "$OUTPUT" | awk '{print "  → " $1 " lines"}'

# When writing to the sidecar, nudge the user toward diffing against the canonical doc.
if [[ "$OUTPUT" != "$REPO_ROOT/NVALOPE_CONTEXT.md" && -f "$REPO_ROOT/NVALOPE_CONTEXT.md" ]]; then
  print_info "Diff against canonical: git diff --no-index -- NVALOPE_CONTEXT.md \"${OUTPUT#$REPO_ROOT/}\""
fi

print_summary "context-pack"
exit 0

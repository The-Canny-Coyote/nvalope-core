#!/usr/bin/env bash
# context-pack.sh — generate an Nvalope context snapshot for editor sessions.
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

## Architecture Rules

- Budget data stays in \`budgetIdb.ts\`; app preferences stay in \`appDataIdb.ts\`.
- UI state belongs in \`appStore.ts\`.
- Period-aware UI totals must use \`getBudgetSummaryForCurrentPeriod()\`, not raw \`envelope.spent\`.
- Dates and rounding come from \`src/app/utils/date.ts\` and \`src/app/utils/format.ts\`.
- Receipt allocation uses \`allocateTotalProportionally\`.
- User-facing toasts should go through \`delayedToast\`, except paired loading/dismiss flows.
- Storage keys live in \`src/app/constants/storageKeys.ts\` and use kebab-case.
- Every network call needs a privacy reason; budget data must not leave the device.

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
    webLLMAssistant.ts             — on-device AI helper
  store/BudgetContext.tsx          — getBudgetSummaryForCurrentPeriod()
  utils/
    format.ts                      — roundTo2 (canonical)
    date.ts                        — todayISO() (canonical)
    classNames.ts                  — shared input className helper
  constants/storageKeys.ts         — storage/session/history key catalog
  components/
    EnvelopesExpensesContent.tsx   — envelopes and savings goals
    WheelMenu.tsx                  — section wheel and expanded dock overlay
public/_headers                    — CSP lives here (not vite.config.ts)
\`\`\`

---

## Audit Focus

- Keep budget and preference data local-first.
- Preserve keyboard and screen-reader access when touching navigation or settings.
- Keep additional modules discoverable without implying paid tiers in this public core app.
- Watch for duplicated date/rounding helpers, raw \`fetch()\` calls, and storage keys outside the catalog.

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

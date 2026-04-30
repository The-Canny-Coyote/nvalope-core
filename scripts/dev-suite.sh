#!/usr/bin/env bash
# dev-suite.sh — Run all Nvalope dev scripts in sequence
# Usage: bash scripts/dev-suite.sh [--skip-context] [--fail-fast]
#
# Flags:
#   --skip-context   Skip context-pack.sh (saves ~2s for quick checks)
#   --fail-fast      Exit on first script failure (exit code 1)

set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

SKIP_CONTEXT=false
FAIL_FAST=false

for arg in "$@"; do
  case "$arg" in
    --skip-context) SKIP_CONTEXT=true ;;
    --fail-fast)    FAIL_FAST=true ;;
  esac
done

SCRIPTS_DIR="$(dirname "$0")"
OVERALL_EXIT=0

run_script() {
  local name="$1"
  local script="$SCRIPTS_DIR/$name"

  echo ""
  echo -e "${BOLD}${CYAN}▶ Running $name${RESET}"
  echo -e "${DIM}────────────────────────────────────────────${RESET}"

  if bash "$script" 2>&1; then
    local rc=0
  else
    local rc=$?
  fi

  if [[ $rc -eq 0 ]]; then
    echo -e "${GREEN}✔ $name passed${RESET}"
  elif [[ $rc -eq 2 ]]; then
    echo -e "${YELLOW}⚠ $name has warnings (exit $rc)${RESET}"
    OVERALL_EXIT=2
  else
    echo -e "${RED}✖ $name failed (exit $rc)${RESET}"
    OVERALL_EXIT=1
    if $FAIL_FAST; then
      echo -e "${RED}Stopping (--fail-fast)${RESET}"
      exit 1
    fi
  fi
}

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║   Nvalope Dev Suite                      ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"
echo -e "${DIM}Branch: $(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)${RESET}"
echo -e "${DIM}$(date)${RESET}"

run_script "repo-health.sh"
run_script "sovereignty-check.sh"
run_script "wrangler-diff.sh"

if ! $SKIP_CONTEXT; then
  run_script "context-pack.sh"
fi

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║   Dev Suite Complete                     ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"

if [[ $OVERALL_EXIT -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All scripts passed.${RESET}"
elif [[ $OVERALL_EXIT -eq 2 ]]; then
  echo -e "${YELLOW}${BOLD}Completed with warnings — review above.${RESET}"
else
  echo -e "${RED}${BOLD}One or more scripts reported errors — review above.${RESET}"
fi

exit $OVERALL_EXIT

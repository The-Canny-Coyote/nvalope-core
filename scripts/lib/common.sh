#!/usr/bin/env bash
# lib/common.sh — shared helpers for Nvalope dev scripts
# Source this file: source "$(dirname "$0")/lib/common.sh"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ── Project root ───────────────────────────────────────────────────────────────
# Walk up from the script's location to find the git root
find_repo_root() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
  while [[ "$dir" != "/" && "$dir" != "." ]]; do
    if [[ -f "$dir/package.json" && -d "$dir/src" ]]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  echo "$(pwd)"
}

REPO_ROOT="$(find_repo_root)"

# ── Printers ──────────────────────────────────────────────────────────────────
print_header() { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}"; }
print_ok()     { echo -e "  ${GREEN}✔${RESET}  $*"; }
print_warn()   { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
print_error()  { echo -e "  ${RED}✖${RESET}  $*"; }
print_info()   { echo -e "  ${DIM}→${RESET}  $*"; }
print_section(){ echo -e "\n${BOLD}$*${RESET}"; }

# ── Counters ──────────────────────────────────────────────────────────────────
WARN_COUNT=0
ERROR_COUNT=0

bump_warn()  { WARN_COUNT=$((WARN_COUNT + 1)); }
bump_error() { ERROR_COUNT=$((ERROR_COUNT + 1)); }

warn()  { print_warn "$@";  bump_warn;  }
error() { print_error "$@"; bump_error; }

# ── Grep helpers ──────────────────────────────────────────────────────────────
# grep_src PATTERN — searches src/ only, returns exit code
grep_src() {
  grep -r --include="*.ts" --include="*.tsx" -l "$1" "$REPO_ROOT/src" 2>/dev/null
}

# grep_src_count PATTERN — count of matching files
grep_src_count() {
  grep_src "$1" | wc -l | tr -d ' '
}

# ── Summary footer ─────────────────────────────────────────────────────────────
print_summary() {
  local script="$1"
  echo ""
  if [[ $ERROR_COUNT -gt 0 ]]; then
    echo -e "${RED}${BOLD}[$script] ${ERROR_COUNT} error(s), ${WARN_COUNT} warning(s)${RESET}"
  elif [[ $WARN_COUNT -gt 0 ]]; then
    echo -e "${YELLOW}${BOLD}[$script] 0 errors, ${WARN_COUNT} warning(s)${RESET}"
  else
    echo -e "${GREEN}${BOLD}[$script] All checks passed${RESET}"
  fi
}

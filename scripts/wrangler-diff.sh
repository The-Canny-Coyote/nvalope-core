#!/usr/bin/env bash
# wrangler-diff.sh — Show what changed in Cloudflare deployment surface
# Diffs public/_headers (CSP), index.html, and any worker/function files
# against the merge-base with main. Alerts on CSP regressions.
#
# Exits 0=clean, 1=errors, 2=warnings-only

set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

print_header "Nvalope Wrangler / Deployment Diff"

cd "$REPO_ROOT"

BASE_BRANCH="${1:-main}"
MERGE_BASE=$(git merge-base HEAD "origin/$BASE_BRANCH" 2>/dev/null || \
             git merge-base HEAD "$BASE_BRANCH" 2>/dev/null || echo "")

if [[ -z "$MERGE_BASE" ]]; then
  warn "Could not find merge-base with $BASE_BRANCH — showing diff against HEAD~1"
  MERGE_BASE="HEAD~1"
fi

print_info "Diffing against merge-base: $MERGE_BASE ($(git log -1 --format="%h %s" $MERGE_BASE 2>/dev/null))"

# ═══════════════════════════════════════════════════════════════════════
# 1. public/_headers (CSP + security headers)
# ═══════════════════════════════════════════════════════════════════════
print_section "1. public/_headers Changes"

HEADERS_DIFF=$(git diff "$MERGE_BASE" HEAD -- "public/_headers" 2>/dev/null || true)

if [[ -z "$HEADERS_DIFF" ]]; then
  print_ok "public/_headers unchanged"
else
  # Check for CSP regressions
  REMOVED_DIRECTIVES=$(echo "$HEADERS_DIFF" | grep "^-" | grep -i "content-security-policy\|strict-transport\|x-frame\|x-content-type" || true)
  LOOSENED=$(echo "$HEADERS_DIFF" | grep "^+" | grep -i "unsafe-inline\|unsafe-eval\|\*" || true)

  if [[ -n "$REMOVED_DIRECTIVES" ]]; then
    error "Security header removed or modified:"
    echo "$REMOVED_DIRECTIVES" | while IFS= read -r line; do print_info "$line"; done
  fi
  if [[ -n "$LOOSENED" ]]; then
    warn "CSP may have been loosened (unsafe-inline/eval or wildcard added):"
    echo "$LOOSENED" | while IFS= read -r line; do print_info "$line"; done
  fi

  echo -e "${DIM}--- Full diff ---${RESET}"
  echo "$HEADERS_DIFF"
fi

# ═══════════════════════════════════════════════════════════════════════
# 2. index.html (script tags, meta, manifest)
# ═══════════════════════════════════════════════════════════════════════
print_section "2. index.html Changes"

INDEX_DIFF=$(git diff "$MERGE_BASE" HEAD -- "index.html" 2>/dev/null || true)

if [[ -z "$INDEX_DIFF" ]]; then
  print_ok "index.html unchanged"
else
  # Flag new <script src="http
  EXTERNAL_SCRIPTS=$(echo "$INDEX_DIFF" | grep "^+" | grep -i "<script.*src=['\"]http" || true)
  if [[ -n "$EXTERNAL_SCRIPTS" ]]; then
    error "External script tag added to index.html:"
    echo "$EXTERNAL_SCRIPTS" | while IFS= read -r line; do print_info "$line"; done
  fi
  echo -e "${DIM}--- Full diff ---${RESET}"
  echo "$INDEX_DIFF"
fi

# ═══════════════════════════════════════════════════════════════════════
# 3. wrangler.toml / wrangler.jsonc (if present)
# ═══════════════════════════════════════════════════════════════════════
print_section "3. Wrangler Config"

WRANGLER_FILE=""
for f in wrangler.toml wrangler.jsonc wrangler.json; do
  [[ -f "$REPO_ROOT/$f" ]] && WRANGLER_FILE="$f" && break
done

if [[ -z "$WRANGLER_FILE" ]]; then
  print_info "No wrangler.toml/jsonc found — Cloudflare Pages deploy (no worker config needed)"
else
  W_DIFF=$(git diff "$MERGE_BASE" HEAD -- "$WRANGLER_FILE" 2>/dev/null || true)
  if [[ -z "$W_DIFF" ]]; then
    print_ok "$WRANGLER_FILE unchanged"
  else
    warn "$WRANGLER_FILE changed:"
    echo "$W_DIFF"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# 4. functions/ or workers/ directory
# ═══════════════════════════════════════════════════════════════════════
print_section "4. Worker/Function Files"

for dir in functions workers; do
  if [[ -d "$REPO_ROOT/$dir" ]]; then
    W_DIFF=$(git diff "$MERGE_BASE" HEAD -- "$dir/" 2>/dev/null || true)
    if [[ -z "$W_DIFF" ]]; then
      print_ok "$dir/ unchanged"
    else
      warn "$dir/ has changes:"
      echo "$W_DIFF"
    fi
  else
    print_info "$dir/ not present (no Cloudflare functions in this project)"
  fi
done

# ═══════════════════════════════════════════════════════════════════════
# 5. vite.config.ts (build config affects deployed bundle)
# ═══════════════════════════════════════════════════════════════════════
print_section "5. vite.config.ts Changes"

VITE_DIFF=$(git diff "$MERGE_BASE" HEAD -- "vite.config.ts" 2>/dev/null || true)

if [[ -z "$VITE_DIFF" ]]; then
  print_ok "vite.config.ts unchanged"
else
  # CSP plugin warning
  if echo "$VITE_DIFF" | grep -q "+.*csp\|+.*vite-plugin-csp"; then
    warn "CSP plugin re-added to vite.config.ts — CSP should live in public/_headers only"
  fi
  echo -e "${DIM}--- Full diff ---${RESET}"
  echo "$VITE_DIFF"
fi

# ═══════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════
print_summary "wrangler-diff"

if [[ $ERROR_COUNT -gt 0 ]]; then exit 1; fi
if [[ $WARN_COUNT -gt 0 ]]; then exit 2; fi
exit 0

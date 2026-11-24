#!/usr/bin/env bash
# check-naming.sh — dependency-free enforcement of kebab-case source filenames.
#
# Reproduces the root .eslintrc.js rule:
#   'filenames/match-regex': [
#     'error',
#     '^[a-z0-9]+(-[a-z0-9]+)*(?:\\.(?:test|spec|d))?$',
#     true,
#   ]
#
# The third option checks the name without its final extension, so
# `user-controller.test.ts` is validated as `user-controller.test`.
#
# Scans tracked .ts/.tsx files with `git ls-files` (no node_modules needed),
# prints every offending path, and exits 1 if any are found. Exceptions are
# documented in docs/quality/issue-1545-baseline.md and mirrored below.
#
# Usage:
#   ./scripts/check-naming.sh
#   git diff --name-only --diff-filter=ACMR | ./scripts/check-naming.sh --stdin
#
# Exit code: 0 if no violations, 1 if any are found.

set -euo pipefail

# The exact ESLint regex (above) expressed as a POSIX ERE for grep -E.
# Non-capturing groups `(?:...)` become plain groups `(...)`.
NAME_REGEX_ERE='^[a-z0-9]+(-[a-z0-9]+)*(\.(test|spec|d))?$'

root="$(git rev-parse --show-toplevel)"
cd "$root"

# Files governed by the root rule: everything outside the two app trees,
# which are independent ESLint roots with their own naming rules and
# framework special-file exemptions (see baseline doc).
#
# Justified exceptions, grandfathered from the exact regex check. Keep this
# list in sync with docs/quality/issue-1545-baseline.md.
EXCEPTIONS="
packages/api/vitest.config.ts
packages/app/src/components/Payment/TransactionSummary.tsx
packages/mobile-app/App.tsx
packages/mobile-app/src/screens/CourseDetailScreen.tsx
packages/mobile-app/src/screens/DiscoveryScreen.tsx
packages/mobile-app/src/screens/ProfileScreen.tsx
packages/mobile/src/__tests__/wallet/useWallet.test.ts
packages/mobile/src/__tests__/wallet/walletService.test.ts
packages/mobile/src/auth/biometricAuth.ts
packages/mobile/src/auth/secureStorage.ts
packages/mobile/src/auth/sessionManager.ts
packages/mobile/src/cache/actionQueue.ts
packages/mobile/src/cache/offlineCache.ts
packages/mobile/src/cache/useNetworkStatus.ts
packages/mobile/src/notifications/deepLinks.ts
packages/mobile/src/notifications/pushService.ts
packages/mobile/src/wallet/useWallet.ts
packages/mobile/src/wallet/walletService.ts
packages/types/src/api.types.ts
packages/types/src/auth.types.ts
packages/types/src/common.types.ts
packages/types/src/course.types.ts
packages/types/src/dispute.types.ts
packages/types/src/domain.types.test.ts
packages/types/src/enrollment.types.ts
packages/types/src/error.types.test.ts
packages/types/src/error.types.ts
packages/types/src/exercise.types.ts
packages/types/src/grant.types.ts
packages/types/src/listing.types.ts
packages/types/src/notification.types.ts
packages/types/src/progress.types.ts
packages/types/src/quiz.types.ts
packages/types/src/stellar.types.ts
packages/types/src/user.types.ts
packages/types/src/validation.types.test.ts
packages/types/src/validation.types.ts
"

is_exception() {
  printf '%s\n' "$EXCEPTIONS" | grep -Fx -- "$1" > /dev/null 2>&1
}

should_skip() {
  local f="$1"
  case "$f" in
    apps/*) return 0 ;;
    */node_modules/*|*/dist/*|*/build/*|*/.next/*|*/coverage/*|*/lib/*|*/out/*|*/generated/*|*/__generated__/*) return 0 ;;
    *.d.ts|*.min.js) return 0 ;;
  esac
  return 1
}

if [ "${1:-}" = "--stdin" ]; then
  files="$(cat)"
else
  files="$(git ls-files -- '*.ts' '*.tsx')"
fi

violations=0
scanned=0

while IFS= read -r f; do
  [ -n "$f" ] || continue
  should_skip "$f" && continue
  is_exception "$f" && continue
  [ -f "$f" ] || continue

  scanned=$((scanned + 1))
  base="${f##*/}"
  case "$base" in
    *.tsx) base="${base%.tsx}" ;;
    *.ts)  base="${base%.ts}" ;;
  esac

  if ! printf '%s\n' "$base" | grep -Eq "$NAME_REGEX_ERE"; then
    echo "naming violation: $f (base: '$base')"
    violations=$((violations + 1))
  fi
done <<< "$files"

echo "Checked $scanned source file(s) against: $NAME_REGEX_ERE"

if [ "$violations" -gt 0 ]; then
  echo "ERROR: $violations filename(s) violate the kebab-case naming convention."
  exit 1
fi

echo "Naming conventions OK."

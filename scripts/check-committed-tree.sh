#!/usr/bin/env sh
set -eu

# Fails when a tracked file cites something deliberately kept out of the
# published tree: planning documents, contributor guides, the architecture and
# convention references, or a package that does not exist on npm.

self=scripts/check-committed-tree.sh

excluded='^ARCHITECTURE\.md$|^CONVENTIONS\.md$|^PERF-TODO\.md$|^PLAN-.*\.md$|^\.github/copilot-instructions\.md$|^docs/|(^|/)TODO\.md$|(^|/)IDEAS\.md$|(^|/)CONTRIBUTING\.md$|(^|/)BYTE-CURSOR\.md$|^packages/format-(xml|svg|dot|gexf|graphml)/'

pattern='ARCHITECTURE\.md|CONVENTIONS\.md|TODO\.md|IDEAS\.md|BYTE-CURSOR\.md|PLAN-[A-Za-z0-9-]*\.md|copilot-instructions|CONTRIBUTING|docs/explanation|@ac-kit/format-(xml|svg|dot|gexf|graphml)|@ac-kit/crypto-cipher'

hits=$(
  git ls-files |
    grep -Ev "$excluded" |
    grep -Fxv "$self" |
    tr '\n' '\0' |
    xargs -0 grep -IlE "$pattern" -- 2>/dev/null || true
)

if [ -n "$hits" ]; then
  printf 'Files citing content excluded from the published tree:\n\n' >&2
  printf '%s\n' "$hits" >&2
  printf '\nInspect with: grep -InE %s <file>\n' "'$pattern'" >&2
  exit 1
fi

printf 'No publishable file cites excluded content.\n'

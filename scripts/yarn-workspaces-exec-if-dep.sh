#!/bin/sh

# Usage: ./scripts/yarn-workspaces-exec-if-dep.sh <dep-field> <dependency> <command>
# Example: ./scripts/yarn-workspaces-exec-if-dep.sh devDependencies typedoc typedoc
# <dep-field> must be: dependencies, devDependencies, or peerDependencies

dep_field="$1"
dep_name="$2"
cmd="$3"

if [ -z "$dep_field" ] || [ -z "$dep_name" ] || [ -z "$cmd" ]; then
  echo "Usage: $0 <dep-field> <dependency> <command>"
  echo "  <dep-field> must be: dependencies, devDependencies, or peerDependencies"
  exit 1
fi

# Get all workspace package locations using yarn workspaces list --json
pkg_paths=$(yarn workspaces list --json | jq -r '.location')

for pkg in $pkg_paths; do
  pkg_json="$pkg/package.json"
  if [ -f "$pkg_json" ]; then
    if jq -e --arg dep "$dep_name" --arg field "$dep_field" '.[$field][$dep]' "$pkg_json" > /dev/null 2>&1; then
      echo "✅ Executing 'yarn exec $cmd' in '$pkg' (found $dep_field: $dep_name)"
      (cd "$pkg" && yarn exec "$cmd") || { echo "❌ yarn exec $cmd failed in '$pkg'"; exit 1; }
    else
      echo "⏭️  Skipping '$pkg' ($dep_name not found in $dep_field)"
    fi
  fi
done

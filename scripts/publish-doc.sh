#!/usr/bin/env sh
set -eu

rootDir=$(dirname "$(dirname "$(realpath "$0")")")
publishDir=
dryRun=0

usage() {
	cat <<EOF
Usage: $(basename "$0") [--dry-run]

Build and publish the website/kit documentation site to the gh-pages branch.
EOF
}

while [ "$#" -gt 0 ]; do
	case "$1" in
	--dry-run)
		dryRun=1
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		printf '%s\n' "Unknown option: $1" >&2
		usage >&2
		exit 2
		;;
	esac
	shift
done

cleanup() {
	if [ -n "$publishDir" ]; then
		rm -rf "$publishDir"
	fi
}

trap cleanup 0 1 2 15

cd "$rootDir"
yarn workspace @ac-kit/crypto-safe run build-wasm
yarn workspace @ac-kit/math-numbers run build-wasm

printf 'Building website/kit\n'
yarn workspace website-kit run build

publishDir=$(mktemp -d)
cp -r website/kit/dist/. "$publishDir/"
touch "$publishDir/.nojekyll"

if [ "$dryRun" -eq 1 ]; then
	fileCount=$(find "$publishDir" -type f -print | wc -l)
	printf 'Documentation assembled successfully (%s files).\n' "$fileCount"
	exit 0
fi

remote=$(git remote get-url origin)
git -C "$publishDir" init
git -C "$publishDir" add .
git -C "$publishDir" commit -m 'Deploy documentation'
git -C "$publishDir" remote add origin "$remote"
git -C "$publishDir" push --force origin HEAD:gh-pages

#!/usr/bin/env bash
# Build the soft-float WASM module and place the binary in math/numbers/wasm/.
#
# Prerequisites:
#   rustup target add wasm32-unknown-unknown
#   (rustup itself from https://rustup.rs)
#   cargo install wasm-opt   (optional, for size optimisation)
#
# Usage (from repo root):
#   yarn workspace @ac-kit/math-numbers build:wasm
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="$PACKAGE_ROOT/wasm"

cd "$SCRIPT_DIR"
cargo build --target wasm32-unknown-unknown --release 2>&1

WASM_SRC="$SCRIPT_DIR/target/wasm32-unknown-unknown/release/soft_float.wasm"
mkdir -p "$OUT_DIR"

# Optional: run wasm-opt for size/speed improvements.
if command -v wasm-opt &> /dev/null; then
    wasm-opt -Os "$WASM_SRC" -o "$OUT_DIR/soft_float.wasm"
else
    cp "$WASM_SRC" "$OUT_DIR/soft_float.wasm"
    echo "   (wasm-opt not found — skipping optimisation)"
fi

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT="$ROOT/contracts/out"
DEST="$ROOT/apps/web/lib/abis"
mkdir -p "$DEST"
jq '.abi' "$OUT/TaniTraceFunding.sol/TaniTraceFunding.json" > "$DEST/TaniTraceFunding.json"
jq '.abi' "$OUT/TANIToken.sol/TANIToken.json" > "$DEST/TANIToken.json"
jq '.abi' "$OUT/TANIFaucet.sol/TANIFaucet.json" > "$DEST/TANIFaucet.json"
echo "ABI synced."

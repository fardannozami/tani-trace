#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
OUTPUT_FILE="$ROOT_DIR/deployments/monadMainnet.json"

if [[ "${CONFIRM_MAINNET:-}" != "YES" ]]; then
  echo "Mainnet deployment is intentionally gated." >&2
  echo "Run with: CONFIRM_MAINNET=YES bash scripts/deploy-mainnet.sh" >&2
  exit 1
fi

command -v forge >/dev/null 2>&1 || { echo "Error: forge tidak ditemukan." >&2; exit 1; }

if [[ ! -f "$CONTRACTS_DIR/.env" ]]; then
  echo "Error: contracts/.env belum ada." >&2
  exit 1
fi

if ! grep -Eq '^PRIVATE_KEY=[^[:space:]]+' "$CONTRACTS_DIR/.env"; then
  echo "Error: PRIVATE_KEY kosong di contracts/.env." >&2
  exit 1
fi

echo "Deploying TaniTrace ke Monad Mainnet (chain ID 143)."
echo "Output: $OUTPUT_FILE"
(
  cd "$CONTRACTS_DIR"
  DEPLOYMENT_OUT="../deployments/monadMainnet.json" \
    forge script script/Deploy.s.sol --rpc-url monad_mainnet --broadcast
)

test -s "$OUTPUT_FILE" || {
  echo "Error: deployment file tidak dibuat: $OUTPUT_FILE" >&2
  exit 1
}

echo "Mainnet deployment selesai. Review addresses di $OUTPUT_FILE sebelum mengubah frontend."

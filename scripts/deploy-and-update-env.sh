#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
WEB_ENV="$ROOT_DIR/apps/web/.env.local"
DEPLOYMENT_RELATIVE="${DEPLOYMENT_OUT:-}"
if [[ -z "$DEPLOYMENT_RELATIVE" ]]; then
  DEPLOYMENT_RELATIVE="$(awk -F= '$1 == "DEPLOYMENT_OUT" { print substr($0, index($0, "=") + 1); exit }' "$CONTRACTS_DIR/.env")"
fi
DEPLOYMENT_RELATIVE="${DEPLOYMENT_RELATIVE:-../deployments/monadTestnet.json}"

if [[ "$DEPLOYMENT_RELATIVE" = /* ]]; then
  DEPLOYMENT_FILE="$DEPLOYMENT_RELATIVE"
else
  DEPLOYMENT_FILE="$CONTRACTS_DIR/$DEPLOYMENT_RELATIVE"
fi

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Error: command '$1' tidak ditemukan." >&2
    exit 1
  }
}

require_command forge
require_command jq

if [[ ! -f "$CONTRACTS_DIR/.env" ]]; then
  echo "Error: contracts/.env belum ada. Jalankan contracts/script/setup.sh lalu isi PRIVATE_KEY." >&2
  exit 1
fi

if ! grep -Eq '^PRIVATE_KEY=[^[:space:]]+' "$CONTRACTS_DIR/.env"; then
  echo "Error: PRIVATE_KEY kosong di contracts/.env." >&2
  exit 1
fi

echo "Deploying ke Monad Testnet..."
(
  cd "$CONTRACTS_DIR"
  forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
)

if [[ ! -s "$DEPLOYMENT_FILE" ]]; then
  echo "Error: deployment file tidak ditemukan: $DEPLOYMENT_FILE" >&2
  exit 1
fi

token="$(jq -er '.token' "$DEPLOYMENT_FILE")"
funding="$(jq -er '.funding' "$DEPLOYMENT_FILE")"
faucet="$(jq -er '.faucet' "$DEPLOYMENT_FILE")"
deploy_block="$(jq -er '.deployedAtBlock' "$DEPLOYMENT_FILE")"

for address in "$token" "$funding" "$faucet"; do
  if [[ ! "$address" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "Error: alamat kontrak tidak valid di deployment file." >&2
    exit 1
  fi
done

if [[ ! "$deploy_block" =~ ^[0-9]+$ ]]; then
  echo "Error: deployedAtBlock tidak valid di deployment file." >&2
  exit 1
fi

if [[ ! -f "$WEB_ENV" ]]; then
  cp "$ROOT_DIR/apps/web/.env.example" "$WEB_ENV"
fi

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp "$WEB_ENV.tmp.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    $0 ~ ("^" key "=") {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) print key "=" value
    }
  ' "$WEB_ENV" > "$tmp"
  mv "$tmp" "$WEB_ENV"
}

set_env_value NEXT_PUBLIC_TOKEN_ADDRESS "$token"
set_env_value NEXT_PUBLIC_FUNDING_ADDRESS "$funding"
set_env_value NEXT_PUBLIC_FAUCET_ADDRESS "$faucet"
set_env_value NEXT_PUBLIC_DEPLOY_BLOCK "$deploy_block"

echo "Deployment selesai dan apps/web/.env.local diperbarui."
echo "  TANIToken        : $token"
echo "  TaniTraceFunding : $funding"
echo "  TANIFaucet       : $faucet"
echo "  deployedAtBlock  : $deploy_block"

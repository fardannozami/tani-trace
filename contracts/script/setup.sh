#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
forge install --no-git OpenZeppelin/openzeppelin-contracts
forge install --no-git foundry-rs/forge-std
forge build

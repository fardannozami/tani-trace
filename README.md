# TaniTrace

Boilerplate TaniTrace v2: protokol pendanaan pertanian transparan di Monad Testnet (chain ID `10143`). Smart contract menjadi sumber kebenaran; frontend Next.js membaca state/event dan menjadi adapter upload IPFS.

## Struktur

- `contracts/` — Foundry project: `TANIToken`, `TANIFaucet`, dan `TaniTraceFunding`.
- `apps/web/` — Next.js + wagmi/viem frontend foundation dan route MVP.
- `docs/` — PRD, desain, arsitektur, dan runbook demo.

## Mulai cepat

```bash
bash contracts/script/setup.sh
cp .env.example contracts/.env
cd apps/web && cp .env.example .env.local && bun install && bun run dev
```

Isi `contracts/.env` dengan `PRIVATE_KEY` dan `MONAD_TESTNET_RPC`, lalu deploy:

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
```

Set alamat hasil deploy ke `apps/web/.env.local`. Kontrak ini adalah boilerplate yang belum diaudit; TNC hanya token simulasi testnet tanpa nilai uang.

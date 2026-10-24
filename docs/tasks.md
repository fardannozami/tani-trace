# TaniTrace — Development Tasks

Status: `[x]` done · `[ ]` planned · `[-]` out of scope.

## Kontrak

- [x] `TANIToken` — ERC-20 "TANI", supply tetap 1.000.000e18, tanpa mint publik, tanpa owner.
- [x] `TANIFaucet` — saldo pra-isi, satu klaim per alamat, `claimAmount` immutable, `ReentrancyGuard`.
- [x] `TaniTraceFunding` — campaign, kontribusi ERC-20, transisi ACTIVE/FAILED/COMPLETED, pengajuan, voting 24 jam, finalisasi permissionless, pencairan satu kali, refund, `completeCampaign`, paginasi maks 100, tanpa admin/pause.
- [x] Manifest hash on-chain + paritas frontend (viem) + fixture.

## Test

- [x] Foundry unit/integration, fuzz, invariant (85 test).
- [x] Frontend unit (35 test).

Verifikasi:

```bash
cd contracts && forge build && forge test
cd apps/web && npx tsc --noEmit && bun run lint && bun run test
```

## Frontend foundation

- [x] `useContractTx` — cek chain per tx, `estimateGas` + 10%, tanpa retry.
- [x] Kartu bagikan campaign dengan QR + salin tautan di detail campaign,
  termasuk peringatan URL localhost.
- [x] `lib/contract.ts`, `lib/manifest.ts`, hooks campaign/token/audit/IPFS.
- [x] Upload API dengan nonce + EIP-191 + HMAC relay Pinata.
- [x] Validasi MIME/ekstensi + batas ukuran (4 MB/file, 8 MB bundle) bersama
  klien dan server (`lib/file-types.ts`, `hooks/useIPFS.ts`,
  `app/api/upload/_lib/auth.ts`).
- [x] Umpan balik advisory di UI (`AdvisoryCard`) dengan error non-blocking.
- [x] Pemeriksaan awal bukti via Gemini (advisory): route
  `/api/evidence/advisory`, hasil di manifest IPFS, tidak on-chain, tidak ikut
  `manifestHash`, gagal/kunci kosong tidak memblokir upload.

## Halaman

- [x] `/`, `/campaigns`, `/campaigns/new`, `/campaigns/[campaignId]`,
  `/campaigns/[campaignId]/requests/[requestId]`, `/dashboard`, `/audit`,
  `/refund`, `/faucet`.

## Dokumentasi

- [x] `README.md`, `docs/monad-blitz-build-guide.md`, `docs/architecture.md`,
  `docs/tasks.md` diperbarui ke v2.
- [x] PRD v2.0 diselaraskan dengan implementasi: field pengajuan, batas string,
  alur upload/manifest, advisory AI, route API, environment, event, dan jumlah
  test.

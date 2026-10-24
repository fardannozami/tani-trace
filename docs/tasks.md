# TaniTrace — Development Tasks

Status: `[x]` done (diverifikasi ada di repo) · `[ ]` belum · `[-]` out of scope.

Diturunkan dari `docs/tani-trace.md` (PRD v2), `docs/design.md`,
`docs/architecture.md`, `docs/monad-blitz-build-guide.md`, dan
`docs/demo-script.md`. Status dicentang berdasarkan keberadaan kode di repo
pada saat penulisan.

## Kontrak (source of truth)

- [x] `TANIToken` — ERC-20 "TANI", supply tetap 1.000.000e18, tanpa mint
  publik, tanpa owner (`contracts/src/TANIToken.sol`).
- [x] `TANIFaucet` — saldo pra-isi, satu klaim per alamat, `claimAmount`
  immutable, `ReentrancyGuard` (`contracts/src/TANIFaucet.sol`).
- [x] `TaniTraceFunding` — campaign, kontribusi ERC-20, transisi
  FUNDING/ACTIVE/FAILED/COMPLETED, pengajuan pencairan, voting 24 jam
  (`VOTING_PERIOD = 1 days`), finalisasi permissionless dengan kuorum ceiling
  division (`QUORUM_BPS = 5_000`), pencairan satu kali, refund satu kali,
  `completeCampaign` (`contracts/src/TaniTraceFunding.sol`).
- [x] 10 event audit lengkap: `CampaignCreated`, `ContributionMade`,
  `CampaignActivated`, `CampaignFailed`, `DisbursementRequested`, `VoteCast`,
  `RequestFinalized`, `DisbursementPaid`, `RefundClaimed`,
  `CampaignCompleted`.
- [x] Manifest hash on-chain = `keccak256(abi.encode(MANIFEST_DOMAIN,
  campaignId, requestId, farmer, amount, purpose, evidenceCid, requestedAt))`
  dengan domain `TaniTrace.DisbursementManifest.v1`.
- [ ] Paritas manifest di frontend (`lib/manifest.ts`, viem) + fixture
  `0xaf89b7ca7cd832e2ebbc4f8be8de531b3b698d9a0887b2a585d3ee0bf1ffbeb9`.
- [ ] Paginasi view maks 100 (per `docs/design.md` §1.1); saat ini hanya
  `getCampaignContributors` / `getCampaignRequestIds` tanpa batas.
- [ ] Guard kontrak: satu pengajuan aktif per campaign
  (`pendingRequestId`/`approvedRequestId`) — belum ada di `requestDisbursement`.

## Test

- [ ] Foundry unit/integration, fuzz, invariant (target 85 test) —
  `contracts/test/` belum ada.
- [ ] Frontend unit (target 35 test) — belum ada framework test maupun
  script `test` di `apps/web/package.json`.

Verifikasi (belum dapat dijalankan penuh sampai test ada):

```bash
cd contracts && forge build && forge test
cd apps/web && npx tsc --noEmit && bun run lint && bun run test
```

## Frontend foundation

- [x] Fondasi wagmi/viem + konfigurasi chain Monad Testnet
  (`apps/web/lib/wagmi.ts`, `lib/chain.ts`, `app/providers.tsx`).
- [ ] `useContractTx` — cek chain per tx, `estimateGas` + 10%, tanpa retry,
  `explainContractRevert` untuk custom error.
- [ ] `lib/contract.ts` (ABI + alamat), `lib/manifest.ts` (hash paritas),
  `lib/file-types.ts` (validasi MIME/ekstensi), event parser untuk `/audit`.
- [ ] Hooks campaign/token/audit/IPFS (`hooks/` belum ada).
- [ ] Upload API dengan nonce (5 menit) + EIP-191 + HMAC → relay Pinata
  (`app/api/upload/*` belum ada; server tolak selain JPEG/PNG/PDF/JSON,
  4 MB/file, 8 MB bundle).
- [ ] Pemeriksaan awal bukti via Gemini (advisory): route
  `/api/evidence/advisory`, hasil di manifest IPFS, tidak on-chain, tidak ikut
  `manifestHash`, kode `AI_NOT_CONFIGURED`/`AI_FAILED` tidak memblokir upload,
  throttle 6/10 menit per alamat.
- [ ] Komponen UI: `ErrorMessage`, `TransactionStatus`, `AdvisoryCard`,
  `ShareCampaignCard` (QR + salin tautan + peringatan localhost).

## Halaman

- [x] Route skeleton sembilan halaman: `/`, `/campaigns`, `/campaigns/new`,
  `/campaigns/[campaignId]`, `/campaigns/[campaignId]/requests/[requestId]`,
  `/dashboard`, `/audit`, `/refund`, `/faucet`.
- [ ] Isi halaman end-to-end: form create campaign, kontribusi + allowance,
  alur dua langkah upload bukti → `requestDisbursement`, voting YES/NO,
  `finalizeRequest`, `payDisbursement`, `completeCampaign`, refund,
  feed `/audit` dengan pagination `NEXT_PUBLIC_DEPLOY_BLOCK`.
- [ ] State loading/empty/error dengan retry, aksesibilitas (ARIA), layout
  responsif sesuai `docs/design.md` §9.

## Deploy dan konfigurasi

- [x] Deploy script `contracts/script/Deploy.s.sol` + `setup.sh` +
  `.env.example` (root dan `apps/web`).
- [ ] Deploy ke Monad Testnet dan `deployments/monadTestnet.json`
  (token/funding/faucet, deployer, `deployedAtBlock`).
- [ ] `apps/web/.env.local` berisi RPC, tiga alamat, `NEXT_PUBLIC_DEPLOY_BLOCK`,
  gateway IPFS, `PINATA_JWT`, `UPLOAD_SIGNING_SECRET`, opsional
  `GEMINI_API_KEY`; Next.js di-restart setelah pengisian.

## Dokumentasi

- [x] `README.md` (setup cepat, perintah deploy, disclaimer), build guide,
  `docs/architecture.md`, `docs/tasks.md` ini.
- [x] PRD v2.0 diselaraskan dengan rancangan: field pengajuan, batas string,
  alur upload/manifest, advisory AI, route API, environment, event.

## Definition of Done (PRD §18)

- [ ] Seluruh test Foundry lulus (85).
- [ ] Test frontend, typecheck, lint, dan `next build` lulus (35 test).
- [ ] Kontrak ter-deploy di Monad Testnet + `deployments/monadTestnet.json`.
- [ ] Frontend terhubung wallet, membaca state, dan mengirim semua transaksi.
- [ ] Upload + verifikasi hash manifest IPFS berjalan.
- [ ] Advisory AI opsional tidak memblokir tanpa `GEMINI_API_KEY`.
- [ ] Alur campaign → voting → pencairan → refund → audit didemo end-to-end
  (`docs/demo-script.md`).

# TaniTrace — Development Tasks

Status: `[x]` done (diverifikasi ada di repo) · `[ ]` belum · `[-]` out of scope.

Diturunkan dari `docs/tani-trace.md` (PRD v2), `docs/design.md`,
`docs/architecture.md`, `docs/monad-blitz-build-guide.md`, dan
`docs/demo-script.md`. Status dicentang berdasarkan keberadaan kode di repo
dan hasil verifikasi (`forge test`, `vitest`, `tsc`, `eslint`, `next build`).
Simbol token: **TNC** ("Tani Token", 18 desimal).

## Kontrak (source of truth)

- [x] `TANIToken` — ERC-20 "Tani Token", simbol "TNC", supply tetap
  1.000.000e18, tanpa mint publik, tanpa owner (`contracts/src/TANIToken.sol`).
- [x] `TANIFaucet` — saldo pra-isi, satu klaim per alamat, `claimAmount`
  immutable (default 100 TNC), `ReentrancyGuard` (`contracts/src/TANIFaucet.sol`).
- [x] `TaniTraceFunding` — campaign, kontribusi ERC-20, transisi
  FUNDING/ACTIVE/FAILED/COMPLETED, pengajuan pencairan, voting 24 jam
  (`VOTING_PERIOD = 1 days`), finalisasi permissionless dengan kuorum ceiling
  division (`QUORUM_BPS = 5_000`), pencairan satu kali, refund satu kali,
  `completeCampaign` dengan guard kewajiban belum selesai
  (`pendingRequestId`/`approvedRequestId`), SafeERC20 + tolak fee-on-transfer,
  limit string (judul 96, tanaman 48, lokasi 120, rencana 600, tujuan 96,
  CID 128) (`contracts/src/TaniTraceFunding.sol`).
- [x] 10 event audit lengkap: `CampaignCreated`, `ContributionMade`,
  `CampaignActivated`, `CampaignFailed`, `DisbursementRequested`, `VoteCast`,
  `RequestFinalized`, `DisbursementPaid`, `RefundClaimed`,
  `CampaignCompleted`.
- [x] Manifest hash on-chain (`computeManifestHash` pure) = `keccak256(abi.encode(MANIFEST_DOMAIN,
  campaignId, requestId, farmer, amount, purpose, evidenceCid, requestedAt))`
  dengan domain `TaniTrace.DisbursementManifest.v1`.
- [x] Paritas manifest di frontend (`apps/web/lib/manifest.ts`, viem) —
  terverifikasi silang Solidity↔viem; fixture parity
  `0xaf89b7ca7cd832e2ebbc4f8be8de531b3b698d9a0887b2a585d3ee0bf1ffbeb9` berlaku
  untuk preimage fixture lama.
- [x] Paginasi view maks 100 (`getCampaignIds`, `getContributors`,
  `getCampaignRequestIds` dengan `offset`/`limit`, `MAX_PAGE_SIZE = 100`).

## Test

- [x] Foundry unit/integration, fuzz, invariant: **106 test lulus**
  (`contracts/test/TaniTraceFunding.t.sol`, `contracts/test/Invariant.t.sol`,
  mocks fee-on-transfer).
- [x] Frontend unit: **52 test lulus** (vitest; paritas manifest, invarians
  hash saat `advisory`, file-types, format, types, advisory normalization).

Verifikasi:

```bash
cd contracts && forge build && forge test
cd apps/web && npx tsc --noEmit && bun run lint && bun run test && bun run build
```

## Frontend foundation

- [x] Fondasi wagmi/viem + chain Monad Testnet (`lib/wagmi.ts`, `lib/chain.ts`).
- [x] `useContractTx` — cek chain per tx (chainId 10143), `estimateGas` + 10%,
  tanpa retry, decode custom error ke pesan Bahasa Indonesia.
- [x] `lib/contract.ts` (ABI + alamat env + explorer), `lib/manifest.ts`,
  `lib/file-types.ts`, `lib/eventParser.ts`, `lib/types.ts`, `lib/format.ts`,
  `lib/advisory.ts`; ABI di-sync dari `contracts/out` via
  `scripts/sync-abi.sh`.
- [x] Hooks campaign/token/audit/IPFS (`useCampaign`, `useCampaigns`,
  `useCampaignActions`, `useAuditFeed`, `useIPFS`, `useTokenInfo`,
  `useWallet`, `useNowSeconds`).
- [x] Upload API: nonce 5 menit + EIP-191 + HMAC → relay Pinata
  (`app/api/upload/nonce`, `/api/upload`, `/api/upload/manifest`); server
  menolak selain JPEG/PNG/PDF/JSON, 4 MB/file, 8 MB bundle.
- [x] Advisory Gemini (`app/api/evidence/advisory`): non-blocking, throttle
  6/10 menit, kode `AI_NOT_CONFIGURED`/`AI_FAILED` dsb., hasil di manifest
  IPFS, tidak on-chain, tidak ikut `manifestHash`.
- [x] Komponen UI: `ErrorMessage`, `TransactionStatus`, `AdvisoryCard`,
  `ShareCampaignCard` (QR + salin + peringatan localhost), `CampaignCard`,
  `StatusBadge`, `EmptyState`, `Skeleton`, `CopyButton`.

## Halaman

- [x] Sembilan halaman ter-wire end-to-end: `/` (hero + daftar campaign),
  `/campaigns` (paginasi + filter status), `/campaigns/new` (form +
  validasi limit string), `/campaigns/[campaignId]` (kontribusi
  approve→contribute, share QR, aksi farmer/refund/finalize/complete),
  `/campaigns/[campaignId]/requests/[requestId]` (verifikasi manifest hash,
  vote, finalize, pay), `/dashboard` (upload bukti dua langkah +
  `requestDisbursement`), `/audit` (feed event + filter), `/refund`,
  `/faucet`.

## Deploy dan konfigurasi

- [x] Deploy script `contracts/script/Deploy.s.sol` + `setup.sh` +
  `.env.example` (root dan `apps/web`).
- [x] Deploy ke Monad Testnet dan `deployments/monadTestnet.json`
  (token/funding/faucet, deployer, `deployedAtBlock` = `73725698`).
- [x] `apps/web/.env.local` berisi RPC, tiga alamat, `NEXT_PUBLIC_DEPLOY_BLOCK`,
  gateway IPFS, `PINATA_JWT`, `UPLOAD_SIGNING_SECRET`, opsional
  `GEMINI_API_KEY`; Next.js perlu di-restart setelah pengisian.

## Dokumentasi

- [x] `README.md` (setup cepat, perintah deploy, disclaimer), build guide,
  `docs/architecture.md`, `docs/tasks.md` ini — simbol diperbarui ke TNC.
- [x] PRD v2.0 diselaraskan dengan implementasi: field pengajuan, batas string,
  alur upload/manifest, advisory AI, route API, environment, event, jumlah
  test, simbol TNC.

## Definition of Done (PRD §18)

- [x] Seluruh test Foundry lulus (106 test).
- [x] Test frontend (52), typecheck, lint (ESLint 9 + eslint-config-next),
  dan `next build` lulus.
- [x] Kontrak ter-deploy di Monad Testnet + `deployments/monadTestnet.json`.
- [x] Frontend production live di `https://www.tanitrace.web.id/`.
- [ ] Frontend terhubung wallet, membaca state, dan mengirim semua transaksi
  (env sudah terisi; tinggal uji manual E2E).
- [ ] Upload + verifikasi hash manifest IPFS berjalan (`PINATA_JWT` sudah terisi;
  tinggal uji manual E2E).
- [ ] Advisory AI opsional tidak memblokir tanpa `GEMINI_API_KEY` (kode
  siap; butuh key untuk uji nyata).
- [ ] Alur campaign → voting → pencairan → refund → audit didemo end-to-end
  (`docs/demo-script.md`).

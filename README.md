# TaniTrace

Protokol pendanaan pertanian transparan di **Monad Testnet** (chain ID `10143`).
Petani membuat campaign, investor menyetor token **TNC** (simulasi), dan setiap
pencairan dana harus lolos voting investor secara on-chain.

Smart contract adalah satu-satunya sumber kebenaran. Frontend Next.js hanya
membaca state/event dan menjadi adapter upload IPFS — tidak ada backend
permanen atau database.

**Status verifikasi:** `forge test` 95 test lulus · frontend 35 test lulus ·
`tsc`, ESLint, dan `next build` lulus.

## Fitur

- **Campaign** — target pendanaan, deadline, status `FUNDING → ACTIVE/FAILED →
  COMPLETED`, aktivasi otomatis saat target tercapai.
- **Kontribusi** — token ERC-20 TNC dengan allowance; transfer yang memotong fee
  (fee-on-transfer) ditolak agar akuntansi escrow tetap 1:1.
- **Pengajuan pencairan** — nominal, tujuan, CID bukti IPFS, `manifestHash`
  on-chain; satu pengajuan aktif dan satu `APPROVED` belum dibayar per campaign.
- **Voting 24 jam** — bobot = kontribusi tercatat (bukan saldo wallet), kuorum
  50% dibulatkan ke atas, YES harus lebih besar dari NO. Finalisasi
  permissionless; hasil `APPROVED`/`REJECTED`/`EXPIRED`.
- **Pencairan satu kali** — hanya petani pemilik pengajuan, nominal persis yang
  disetujui; `releasedTotal` mencakup refund.
- **Refund** — campaign `FAILED`, satu klaim per wallet, transisi malas saat
  `claimRefund`.
- **Bukti IPFS** — upload via Pinata dengan otorisasi nonce + EIP-191 + HMAC;
  batas 4 MB/file dan 8 MB/bundel; verifikasi ulang `manifestHash` di frontend.
- **Advisory AI (opsional)** — pemeriksaan awal berkas via Gemini. Hasilnya
  masuk manifest IPFS, **tidak** on-chain, tidak ikut `manifestHash`, dan tidak
  pernah memblokir upload/transaksi.
- **Audit feed** — `/audit` merekonstruksi 10 event on-chain dengan rentang blok
  terbatas dan tautan explorer.
- Tanpa owner, admin, pause, atau upgrade path.

## Stack

| Bagian | Teknologi |
|---|---|
| Kontrak | Solidity `^0.8.28`, Foundry, OpenZeppelin (ERC20, SafeERC20, ReentrancyGuard) |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, wagmi v2, viem, TanStack Query |
| Bukti | IPFS via Pinata, manifest JSON kanonis |
| AI | Gemini (`gemini-2.5-flash`, opsional) |
| Test | Foundry (unit/fuzz/invariant), Vitest |

## Struktur

```
contracts/            Foundry: src/, test/, script/
  src/TANIToken.sol           ERC-20 "Tani Token" (TNC), supply tetap 1.000.000
  src/TANIFaucet.sol          Klaim 100 TNC sekali per alamat
  src/TaniTraceFunding.sol    Campaign, kontribusi, voting, pencairan, refund
apps/web/             Next.js App Router
  app/                        Halaman + API routes (upload, advisory)
  components/                 UI (campaign, ui)
  hooks/                      useContractTx, useCampaign, useIPFS, dll.
  lib/                        ABI, manifest hash, tipe, format, event parser
  test/                       Vitest (35 test)
docs/                 PRD, desain, arsitektur, build guide, demo script, tasks
```

Halaman: `/`, `/campaigns`, `/campaigns/new`, `/campaigns/[campaignId]`,
`/campaigns/[campaignId]/requests/[requestId]`, `/dashboard`, `/audit`,
`/refund`, `/faucet`.

## Prasyarat

- Foundry (`forge`, `cast`)
- Node.js 20+ dan Bun
- Wallet EIP-1193 (MetaMask atau sejenis) di Monad Testnet
- MON testnet untuk gas (TNC tidak punya nilai uang)

## Mulai cepat

```bash
bash contracts/script/setup.sh          # install dependency Foundry
cp .env.example contracts/.env
cd apps/web && cp .env.example .env.local && bun install && cd ../..
```

### 1. Konfigurasi `contracts/.env`

```env
PRIVATE_KEY=<private-key-deployer>
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
FAUCET_ALLOCATION=200000
FAUCET_CLAIM_AMOUNT=100
DEPLOYMENT_OUT=../deployments/monadTestnet.json
```

### 2. Deploy ke Monad Testnet

```bash
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
```

Deploy membuat `TANIToken`, `TaniTraceFunding`, `TANIFaucet` (klaim
`FAUCET_CLAIM_AMOUNT`, default 100 TNC), mentransfer `FAUCET_ALLOCATION` TNC ke
faucet, dan menulis `deployments/monadTestnet.json` (tiga alamat, deployer,
`chainId`, `deployedAtBlock`). Forge memuat `contracts/.env` otomatis; jangan
menaruh private key di argumen CLI.

### 3. Konfigurasi `apps/web/.env.local`

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_MONAD_TESTNET_RPC` | ya | RPC Monad Testnet |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | ya | Alamat `TANIToken` |
| `NEXT_PUBLIC_FUNDING_ADDRESS` | ya | Alamat `TaniTraceFunding` |
| `NEXT_PUBLIC_FAUCET_ADDRESS` | ya | Alamat `TANIFaucet` |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | ya | Blok deployment untuk rentang `getLogs` |
| `NEXT_PUBLIC_IPFS_GATEWAY` | ya | Gateway untuk membuka bukti |
| `PINATA_JWT` | upload | JWT Pinata (server-only) |
| `PINATA_GATEWAY` | upload | Gateway Pinata (server-only) |
| `UPLOAD_SIGNING_SECRET` | upload | Secret HMAC nonce/token (server-only) |
| `GEMINI_API_KEY` | opsional | Kosong = advisory dilewati |
| `GEMINI_MODEL` | opsional | Default `gemini-2.5-flash` |

`NEXT_PUBLIC_*` ter-inline ke bundel browser — jangan menaruh secret di prefix
itu. Env dibaca saat startup, jadi **restart** `bun run dev` setelah mengubahnya.

### 4. Jalankan frontend

```bash
cd apps/web && bun run dev
```

Buka `http://localhost:3000`, hubungkan wallet, dan pastikan jaringan Monad
Testnet (chain ID `10143`). Transaksi di chain lain ditolak sebelum dikirim.

## Verifikasi

```bash
cd contracts && forge build && forge test        # 95 test
cd apps/web && npx tsc --noEmit                  # typecheck
cd apps/web && bun run lint                      # ESLint 9 (0 masalah)
cd apps/web && bun run test                      # 35 test (Vitest)
cd apps/web && bun run build                     # production build
```

Script bantuan: `bash apps/web/scripts/sync-abi.sh` menyegarkan ABI frontend dari
`contracts/out` setelah kontrak berubah.

## Alur demo (ringkas)

1. `/faucet` — klaim 100 TNC (sekali per wallet).
2. `/campaigns/new` — buat campaign (judul, tanaman, lokasi, rencana, target,
   deadline).
3. `/campaigns/[id]` — investor approve allowance lalu `contribute` hingga target;
   campaign otomatis `ACTIVE`.
4. `/dashboard` — petani unggah bukti ke IPFS (opsional advisory), lalu kirim
   `requestDisbursement` (status `PENDING`, voting 24 jam).
5. `/campaigns/[id]/requests/[requestId]` — verifikasi `manifestHash`, investor
   vote YES/NO; setelah deadline siapa pun `finalizeRequest`.
6. Jika `APPROVED`, petani `payDisbursement` (status `PAID`); lalu
   `completeCampaign` setelah tidak ada kewajiban tersisa.
7. `/audit` — seluruh event on-chain tampil dengan tautan explorer.
8. Skenario negatif: campaign di bawah target → `FAILED` → `/refund`.

Time warp lokal: `cast rpc evm_increaseTime 86401 && cast rpc evm_mine`.
Detail langkah ada di [`docs/demo-script.md`](docs/demo-script.md) dan
[`docs/monad-blitz-build-guide.md`](docs/monad-blitz-build-guide.md).

## Batasan dan keamanan

- Kontrak **belum diaudit**; MVP hackathon, jangan dipakai untuk dana sungguhan.
- TNC token simulasi tanpa nilai uang; pengguna membayar gas dalam MON.
- Tidak ada resistensi Sybil (faucet satu klaim per alamat).
- Kontrak tidak membuktikan kebenaran isi bukti IPFS maupun penggunaan dana;
  IPFS hanya membuktikan kecocokan konten terhadap referensi yang tercatat.
- Advisory AI dapat salah atau terpengaruh prompt injection dan tidak pernah
  menjadi keputusan on-chain; laporan di bundel IPFS adalah klaim yang tidak
  diverifikasi ulang.
- Rate limit advisory bersifat in-memory per proses server (6/10 menit per
  alamat), bukan perlindungan produksi.
- RPC publik membatasi rentang `getLogs`; atur `NEXT_PUBLIC_DEPLOY_BLOCK`.
- `getCampaign` mengembalikan array `contributors`/`requestIds` penuh; hanya
  list view yang ber-paginasi (maks 100).

## Dokumentasi

- [`docs/tani-trace.md`](docs/tani-trace.md) — PRD v2.0
- [`docs/design.md`](docs/design.md) — desain teknis
- [`docs/architecture.md`](docs/architecture.md) — komponen, invariant, trust boundary
- [`docs/monad-blitz-build-guide.md`](docs/monad-blitz-build-guide.md) — rebuild + demo
- [`docs/demo-script.md`](docs/demo-script.md) — skrip demo 2–3 menit
- [`docs/tasks.md`](docs/tasks.md) — status pekerjaan

Kontrak tidak memiliki admin, pause, atau upgrade path. Sisa escrow yang tidak
pernah diajukan tetap berada di contract dan tidak dapat diambil sepihak.

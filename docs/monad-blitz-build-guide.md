# TaniTrace — Panduan Rebuild dan Demo

Panduan dari clone bersih sampai demo berjalan. Smart contract adalah sumber
kebenaran; Next.js membaca state, mengirim transaksi lewat `useContractTx`, dan
menjadi adapter untuk Pinata.

## Prasyarat

- Foundry (`forge`, `cast`), Node.js 20+, Bun (opsional), wallet EIP-1193.
- Tiga kontrak: `TANIToken`, `TANIFaucet`, `TaniTraceFunding`.
- Halaman: `/`, `/campaigns`, `/campaigns/new`, `/campaigns/[campaignId]`,
  `/campaigns/[campaignId]/requests/[requestId]`, `/dashboard`, `/audit`,
  `/refund`, `/faucet`.

## 1. Instalasi bersih

```bash
cd /home/xcode/Documents/tani-trace
bash contracts/script/setup.sh
cd apps/web && npm install && cd ../..
cp apps/web/.env.example apps/web/.env.local
cp .env.example contracts/.env
```

Isi `contracts/.env`:

```env
PRIVATE_KEY=<private-key-deployer>
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
```

Isi `apps/web/.env.local` (alamat diisi setelah deploy):

```env
NEXT_PUBLIC_MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_FUNDING_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_FAUCET_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_DEPLOY_BLOCK=
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud
PINATA_JWT=<pinata-jwt>
PINATA_GATEWAY=https://gateway.pinata.cloud
UPLOAD_SIGNING_SECRET=<random-server-secret>
GEMINI_API_KEY=<gemini-api-key-opsional>
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_API_KEY` opsional. Jika kosong, upload tetap berjalan dan manifest
disimpan tanpa bagian `advisory`.

## 2. Validasi sebelum deploy

```bash
cd contracts
forge build
forge test
cd ../apps/web
npx tsc --noEmit
bun run lint
bun run test
cd ../..
```

Ekspektasi: `forge test` lulus (85 test), `tsc` tanpa error, lint bersih, 35 test frontend lulus.

## 3. Deploy ke Monad Testnet

Dry-run (tidak mengirim transaksi, tetapi membutuhkan `PRIVATE_KEY`):

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url monad_testnet
```

Deploy sungguhan:

```bash
forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
```

Forge memuat `contracts/.env` otomatis. Jangan menaruh private key sebagai
argumen `--private-key` di baris perintah agar tidak tersimpan di shell history.

Output yang diharapkan mencakup:

```
TaniTrace v2 berhasil dideploy.
  network        : Monad Testnet (chainId 10143)
  TANIToken      : 0x...
  TaniTraceFunding: 0x...
  TANIFaucet     : 0x...
```

Script juga menulis `deployments/monadTestnet.json` (token/funding/faucet, deployer, `deployedAtBlock`).

Salin alamat ke `apps/web/.env.local`:

```bash
# contoh membaca file
cat deployments/monadTestnet.json
```

Set `NEXT_PUBLIC_TOKEN_ADDRESS`, `NEXT_PUBLIC_FUNDING_ADDRESS`,
`NEXT_PUBLIC_FAUCET_ADDRESS`, dan `NEXT_PUBLIC_DEPLOY_BLOCK` (nilai
`deployedAtBlock`). Restart Next.js karena env dibaca saat startup.

## 4. Isi faucet (opsional, jika allocation tidak otomatis)

Deploy script sudah mentransfer `FAUCET_ALLOCATION` (default 200000 TNC) ke
faucet. Jika faucet kosong, transfer TNC manual:

```bash
cast send $NEXT_PUBLIC_TOKEN_ADDRESS "transfer(address,uint256)" \
  $NEXT_PUBLIC_FAUCET_ADDRESS 200000000000000000000000 \
  --rpc-url $MONAD_TESTNET_RPC --private-key $PRIVATE_KEY
```

## 5. Jalankan frontend

Deployment production tersedia di [www.tanitrace.web.id](https://www.tanitrace.web.id/).
Gunakan URL tersebut untuk demo publik; langkah berikut dipakai untuk development
lokal.

```bash
cd apps/web
bun run dev
```

Buka `http://localhost:3000` untuk development lokal, atau
[www.tanitrace.web.id](https://www.tanitrace.web.id/) untuk deployment production.
Hubungkan wallet dan pindahkan ke Monad Testnet (chain ID 10143).

## 6. Runbook demo end-to-end

1. Deploy contract (bagian 3) dan konfigurasi frontend.
2. Petani dan 2-3 investor mengklaim TNC dari `/faucet`.
3. Petani membuka `/campaigns/new`, mengisi judul, jenis tanaman, lokasi,
   target TNC, deadline, rencana dana, lalu membuat campaign (status
   `FUNDING`).
4. Setiap investor menyetujui allowance TNC ke `TaniTraceFunding`, lalu
   berkontribusi dari `/campaigns/[campaignId]` hingga target tercapai.
   Saat target tercapai, campaign otomatis menjadi `ACTIVE`.
5. (Opsional negatif) Buat campaign kedua dengan target tidak tercapai hingga
   deadline; panggil `finalizeCampaign` atau `claimRefund` untuk transisi ke
   `FAILED`, lalu kontributor mengklaim refund.
6. Petani membuka `/dashboard`, memilih campaign aktif, lalu menjalankan dua
   langkah: (a) mengisi nominal + tujuan, memilih berkas bukti, dan menekan
   **Unggah bukti** (upload API mem-pin berkas + manifest JSON ke IPFS dan
   menampilkan CID), kemudian (b) menekan **Ajukan pencairan** untuk mengirim
   `requestDisbursement` dengan CID tersebut (status `PENDING`, voting 40 detik pada demo).
   CID tidak diketik manual; nilainya berasal dari hasil unggah. Berkas bukti:
   JPEG/PNG/PDF/JSON, 4 MB/file, 8 MB bundle; pemeriksaan awal AI hanya
   memeriksa hingga 4 berkas JPEG/PNG/PDF. Hasil advisory tampil di UI dan
   manifest, tetapi tidak pernah memblokir transaksi.
7. Investor membuka `/campaigns/[campaignId]/requests/[requestId]`, memeriksa
   bukti dan hash manifest, lalu memilih YES atau NO. Bobot = kontribusi
   tercatat.
8. Tunggu 40 detik (atau time warp pada anvil untuk run lokal). Siapa pun
   memanggil `finalizeRequest`. Hasil: `APPROVED` (kuorum >= 50% dan YES >
   NO), `REJECTED` (kuorum tercapai tetapi YES <= NO), atau `EXPIRED`
   (tanpa kuorum).
9. Jika `APPROVED`, petani memanggil `payDisbursement`; transfer tepat
   sebesar nominal ke petani, status `PAID`.
10. Petani menutup campaign dengan `completeCampaign` setelah tidak ada
    pengajuan aktif maupun approved yang belum dibayar (status `COMPLETED`).
11. `/audit` menampilkan feed event on-chain (kontribusi, pengajuan, suara,
    finalisasi, pencairan, refund, penutupan).

## Manifest hash (verifikasi)

Hash manifest dihitung on-chain:

```
keccak256(abi.encode(
  keccak256("TaniTrace.DisbursementManifest.v1"),
  campaignId, requestId, farmer, amount, purpose, evidenceCid, requestedAt
))
```

Frontend mereproduksi dengan viem (`apps/web/lib/manifest.ts`) dan membandingkan
dengan `request.manifestHash`. Fixture parity:
`0xaf89b7ca7cd832e2ebbc4f8be8de531b3b698d9a0887b2a585d3ee0bf1ffbeb9`.
`evidenceCid` adalah CID bundel JSON bukti di IPFS (file + tujuan + nominal +
waktu pembuatan), bukan hash byte JSON yang dicatat on-chain.

## Troubleshooting

- **Salah jaringan**: pastikan wallet pada chain ID 10143; `useContractTx`
  menolak tx di chain lain.
- **Faucet kosong**: jalankan transfer manual (bagian 4) atau redeploy dengan
  `FAUCET_ALLOCATION` lebih besar.
- **Upload 503 / PINATA_JWT**: pastikan `PINATA_JWT` terisi server-side dan
  restart Next.js; nonce, message, token, dan signature harus dibuat ulang oleh
  wallet yang sama.
- **Advisory AI tidak muncul**: periksa `GEMINI_API_KEY` dan `GEMINI_MODEL` di
  `apps/web/.env.local`, lalu restart Next.js. Tanpa kunci, upload tetap sah dan
  UI hanya menampilkan catatan bahwa pemeriksaan awal tidak tersedia. Kode
  `AI_FAILED` berarti model/API gagal, bukan kegagalan upload.
- **Upload 415**: tipe berkas tidak didukung; gunakan JPEG, PNG, PDF, atau
  JSON.
- **Upload 413**: berkas melebihi 4 MB/file atau bundle melebihi 8 MB.
- **`RATE_LIMITED`**: pemeriksaan awal AI dibatasi 6 panggilan / 10 menit per
  alamat (in-memory per proses server).
- **RPC getLogs range limit**: atur `NEXT_PUBLIC_DEPLOY_BLOCK` ke blok
  deployment; frontend membatasi rentang pemindaian (kosong = 40.000 blok
  terakhir).
- **Env berubah tidak berefek**: env dibaca saat startup; hentikan dev server
  lalu jalankan ulang.
- **Transaksi revert**: periksa status campaign/pengajuan, allowance TNC,
  dan saldo escrow; jangan retry otomatis.
- **Manifest tidak cocok**: pastikan field (campaignId, requestId, farmer,
  amount, purpose, evidenceCid, requestedAt) identik dengan yang on-chain.

## Catatan

- Kontrak tidak memiliki admin, pause, atau upgrade path.
- `cancelBatch` tidak ada di v2; campaign FAILED tidak dapat dibatalkan
  sepihak setelah didanai; refund tersedia untuk kontributor.
- AI tidak digunakan untuk keputusan on-chain.

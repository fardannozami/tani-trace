# TaniTrace — Desain Teknis (v2)

Dokumen ini mendeskripsikan desain teknis protokol TaniTrace v2. Sumber
kebenaran adalah smart contract `TaniTraceFunding.sol`; IPFS menyimpan file dan
manifest; Next.js hanya membaca state/event dan menjadi adapter upload.

## 1. Batas modul

### 1.1 Kontrak (source of truth)

| Kontrak | Berkas | Peran |
|---|---|---|
| `TANIToken` | `contracts/src/TANIToken.sol` | ERC-20 "TANI", supply tetap 1.000.000e18 (18 desimal), dicetak sekali ke deployer, tanpa mint publik, tanpa owner/admin/pause. |
| `TANIFaucet` | `contracts/src/TANIFaucet.sol` | Saldo TANI pra-isi, satu klaim per alamat, `claimAmount` immutable, `ReentrancyGuard`. |
| `TaniTraceFunding` | `contracts/src/TaniTraceFunding.sol` | Campaign, kontribusi ERC-20, transisi status, pengajuan pencairan, voting 24 jam, finalisasi permissionless, pencairan satu kali, refund, `completeCampaign`, view ber-paginasi (maks 100), tanpa owner/admin/pause. |

Kontrak tidak mempercayai frontend. Semua aturan bisnis (kuorum, mayoritas,
pencairan satu kali, refund satu kali) ditegakkan di sini.

### 1.2 Frontend (Next.js)

- `apps/web/app/` — route dan halaman: `/`, `/campaigns`, `/campaigns/new`,
  `/campaigns/[campaignId]`, `/campaigns/[campaignId]/requests/[requestId]`,
  `/dashboard`, `/audit`, `/refund`, `/faucet`.
- `apps/web/components/` — komponen UI dan form.
- `apps/web/hooks/` — baca state/event dan aksi turunan.
- `apps/web/lib/` — tipe, format, ABI, alamat, manifest hash, event parser.

Frontend hanya membaca state/event dari RPC dan mengirim transaksi lewat
`useContractTx`. Tidak ada datastore permanen; cache lokal bersifat opsional
dan bukan sumber kebenaran.

### 1.3 API routes (server-only)

- `apps/web/app/api/upload/*` — nonce + tanda tangan EIP-191 + HMAC; relay file
  ke Pinata/IPFS.
- `apps/web/app/api/evidence/advisory` — pemeriksaan awal berkas (JPEG/PNG/PDF)
  dengan Gemini. Memakai otorisasi upload yang sama. Hasilnya advisory:
  dikembalikan ke klien, disimpan di manifest IPFS, tidak pernah on-chain dan
  tidak memblokir upload/transaksi. Tanpa `GEMINI_API_KEY`, route mengembalikan
  `AI_NOT_CONFIGURED` dan klien melanjutkan tanpa advisory.

Batas unggah: JPEG/PNG/PDF/JSON, 4 MB/file (ditegakkan di server), 8 MB
bundle (klien). Advisory: 1–4 berkas JPEG/PNG/PDF, 4 MB/file, 8 MB total, `purpose`
1–96 karakter, `notes` dipotong 400 karakter; throttle 6/10 menit per alamat
(in-memory). Kode:
`AI_NOT_CONFIGURED`, `RATE_LIMITED`, `BAD_FILE_COUNT`, `BAD_MIME`,
`FILE_TOO_LARGE`, `BUNDLE_TOO_LARGE`, `BAD_PURPOSE`, `BAD_AMOUNT`, `AI_FAILED`,
`UPLOAD_NOT_CONFIGURED`.

API routes tidak menyimpan aturan bisnis. Secret (`PINATA_JWT`,
`UPLOAD_SIGNING_SECRET`, `GEMINI_API_KEY`) hanya ada di server.

### 1.4 IPFS / Pinata

Menyimpan file bukti dan manifest JSON. Tidak tepercaya; kecocokan konten
terhadap referensi on-chain diverifikasi di frontend.

## 2. State machine

### 2.1 Campaign

```
FUNDING ──target tercapai──> ACTIVE ──completeCampaign──> COMPLETED
   │
   └── deadline lewat & totalRaised < target ──> FAILED
```

- `FUNDING`: kontribusi diterima sampai target tercapai atau deadline habis.
- Transisi ke `ACTIVE` terjadi otomatis saat `totalRaised == targetAmount`
  (dalam `contribute`), atau defensif dalam `finalizeCampaign` bila target
  ternyata sudah tercapai.
- `FAILED`: deadline lewat sebelum target tercapai (`finalizeCampaign` atau
  transisi malas di `claimRefund`).
- `COMPLETED`: petani menutup siklus via `completeCampaign`, hanya bila tidak
  ada pengajuan voting maupun pengajuan `APPROVED` yang belum dibayar.

Tidak ada pembatalan sepihak setelah campaign didanai; `cancelBatch` tidak ada
di v2.

### 2.2 Disbursement request

```
PENDING ──finalizeRequest──> APPROVED ──payDisbursement──> PAID
   │
   ├── finalizeRequest ──> REJECTED
   └── finalizeRequest ──> EXPIRED
```

- `PENDING`: voting berlangsung selama `VOTING_PERIOD = 24 hours`.
- `APPROVED`: kuorum tercapai dan bobot YES > bobot NO.
- `REJECTED`: kuorum tercapai tetapi YES <= NO (termasuk seri).
- `EXPIRED`: voting ditutup tanpa kuorum.
- `PAID`: dana sudah ditransfer ke petani, pencairan satu kali.

Satu pengajuan aktif per campaign dijaga oleh `pendingRequestId` dan
`approvedRequestId`.

## 3. Voting math

Konstanta on-chain:

- `VOTING_PERIOD = 24 hours`.
- `QUORUM_BPS = 5_000` (50%).
- `BPS_DENOMINATOR = 10_000`.

Aturan finalisasi (`finalizeRequest`, permissionless setelah deadline):

- kuorum = `ceil(totalRaised * 5000 / 10000)` dengan pembulatan ke atas:
  `(totalRaised * QUORUM_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR`.
- total bobot suara = `yesWeight + noWeight`.
- bila `totalVoted < quorum` (termasuk nol suara) → `EXPIRED`.
- bila kuorum tercapai dan `yesWeight > noWeight` → `APPROVED`.
- bila kuorum tercapai dan `yesWeight <= noWeight` (termasuk seri) → `REJECTED`.

Bobot suara per alamat = kontribusi tercatat (`contributionOf`), bukan saldo
wallet saat ini. Satu suara per alamat per pengajuan.

## 4. Escrow accounting invariant

- Escrow per campaign: `availableEscrow = totalRaised - releasedTotal`.
- Invariant global: saldo token contract >= Σ(totalRaised - releasedTotal)
  seluruh campaign.
- `releasedTotal <= totalRaised` untuk setiap campaign.
- Pada campaign `FAILED`, tidak ada pencairan; refund menambah `releasedTotal`
  dengan jumlah kontribusi yang diklaim.
- Pencairan satu kali (`APPROVED → PAID`); refund satu kali per wallet
  (`refunded` mapping).
- `releasedTotal` mencakup refund.

State diperbarui sebelum transfer token keluar (checks-effects-interactions);
`payDisbursement` dan `claimRefund` memakai `nonReentrant`.

## 5. Manifest hash

Preimage on-chain:

```
keccak256(abi.encode(
  MANIFEST_DOMAIN,            // keccak256("TaniTrace.DisbursementManifest.v1")
  campaignId, requestId, farmer, amount, purpose, evidenceCid, requestedAt
))
```

Frontend mereproduksi dengan viem di `apps/web/lib/manifest.ts`
(`computeManifestHash`), dan membandingkan dengan `request.manifestHash` via
`verifyManifestHash`. Fixture parity:
`0xaf89b7ca7cd832e2ebbc4f8be8de531b3b698d9a0887b2a585d3ee0bf1ffbeb9`.

`evidenceCid` adalah CID bundel JSON bukti di IPFS (file + tujuan + nominal +
waktu pembuatan), bukan hash byte JSON yang dicatat on-chain. Hash on-chain
adalah komitmen terhadap manifest kanonis di atas; `evidenceCid` menunjuk
bundel berkas yang dapat diperiksa. Keduanya saling melengkapi:

- `manifestHash` membuktikan field pengajuan tidak berubah;
- `evidenceCid` menunjuk bundel berkas yang dapat diperiksa.

Bundel JSON boleh memuat field opsional `advisory` (hasil pemeriksaan awal AI).
Field ini **bukan** bagian dari preimage hash dan dapat diubah tanpa
menggugurkan verifikasi; ia hanya konteks tambahan bagi pembaca.

## 6. Peta modul frontend

| Berkas | Tanggung jawab |
|---|---|
| `apps/web/lib/types.ts` | Tipe domain, enum status, helper turunan (`availableEscrow`, `quorumRequired`, `totalVoted`). |
| `apps/web/lib/format.ts` | Format angka/tanggal/alamat. |
| `apps/web/lib/manifest.ts` | `MANIFEST_DOMAIN`, `computeManifestHash`, `buildManifest`, `serializeManifest`, `verifyManifestHash`, tipe `EvidenceManifest`. |
| `apps/web/lib/advisory.ts` | Tipe laporan advisory, disclaimer, `normalizeAdvisoryReport` (validasi output model), label UI. |
| `apps/web/lib/file-types.ts` | `EVIDENCE_MIME_TYPES`, `evidenceMimeType`, `isInspectableEvidenceMime` (validasi MIME/ekstensi bukti). |
| `apps/web/components/campaign/ShareCampaignCard.tsx` | QR code + salin tautan, peringatan host localhost. |
| `apps/web/components/campaign/AdvisoryCard.tsx` | Tampilan hasil/error advisory. |
| `apps/web/lib/contract.ts` | ABI, alamat contract, konfigurasi chain, URL explorer. |
| `apps/web/lib/eventParser.ts` | Dekode event on-chain untuk feed audit. |
| `apps/web/hooks/useContractTx.ts` | Pipeline transaksi: cek chain, encode, `estimateGas` + 10%, kirim, tunggu receipt, tanpa retry. |
| `apps/web/hooks/useCampaign.ts` | Baca campaign, pengajuan, kontribusi, suara. |
| `apps/web/hooks/useCampaigns.ts` | Daftar campaign dengan paginasi. |
| `apps/web/hooks/useCampaignActions.ts` | Aksi turunan (finalize campaign, claim refund, pay disbursement, complete campaign). |
| `apps/web/hooks/useAuditFeed.ts` | Feed audit dari event on-chain dengan rentang blok. |
| `apps/web/hooks/useIPFS.ts` | Upload/ambil berkas, panggil advisory, susun/pin manifest JSON. Mengekspor `MAX_UPLOAD_BYTES` (4 MB) dan `MAX_BUNDLE_BYTES` (8 MB). |
| `apps/web/hooks/useTokenInfo.ts` | Saldo TANI, faucet. |
| `apps/web/hooks/useWallet.ts` | Koneksi wallet, cek Monad Testnet. |
| `apps/web/hooks/useNowSeconds.ts` | Waktu sekarang untuk countdown. |

## 7. Pipeline transaksi

Semua write mengikuti urutan (di `useContractTx`):

1. Cek jaringan (`assertMonadTestnet`) — transaksi ditolak bila chain bukan
   Monad Testnet (chainId 10143).
2. Cek wallet terhubung.
3. Cek alamat contract terkonfigurasi (`isConfigured`).
4. Encode calldata (`encodeFunctionData`).
5. `estimateGas` sebelum kirim — transaksi yang pasti revert tidak dikirim.
6. Gas limit = estimasi + 10% (`estimate + estimate / 10n`).
7. Kirim transaksi (`sendTransactionAsync`).
8. Tunggu receipt (`waitForTransactionReceipt`); sukses bila `receipt.status === "success"`.
9. Tidak ada retry otomatis; kegagalan dikembalikan ke pengguna.

Monad menagih gas berdasarkan gas limit, bukan gas used; karena itu gas limit
dibuat rapat (estimasi + 10%), bukan batas maksimum dompet.

### Pipeline upload bukti

Urutan: nonce (5 menit) → token HMAC → tanda tangan EIP-191 → pemeriksaan
MIME/ukuran server-side → pin Pinata → advisory (opsional, non-blocking) →
manifest JSON di-pin → `requestDisbursement` dengan CID. UX dua langkah:
unggah dulu, baru transaksi. Advisory tidak pernah memblokir upload atau
transaksi.

## 8. Penanganan error

- Custom error contract didekode di `useContractTx.explainContractRevert` (via
  `decodeErrorResult`) dan diterjemahkan ke pesan Bahasa Indonesia yang dapat
  ditindaklanjuti (mis. `InvalidCampaignStatus`, `InsufficientEscrow`,
  `VotingStillOpen`).
- Kegagalan non-revert dipetakan: pembatalan pengguna, jaringan salah,
  gas habis, RPC gagal, upload IPFS gagal.
- `ErrorMessage` (`apps/web/components/ui/ErrorMessage.tsx`) mengklasifikasikan
  error ke kategori: `wallet-missing`, `wrong-network`, `user-rejected`,
  `contract-revert`, `insufficient-gas`, `ipfs-failed`, `rpc-failed`,
  `unknown`, dengan pesan standar dan tombol retry bila relevan.
- Transaksi tidak di-retry otomatis; pengguna diminta memuat ulang state dan
  mencoba ulang manual.

## 9. Aksesibilitas dan responsif

- Komponen UI memakai elemen semantik (`button`, `nav`, `section`) dan atribut
  ARIA (`aria-pressed`, `aria-label`) pada kontrol filter.
- Status transaksi ditampilkan terpisah: `awaiting wallet`, `pending`,
  `success`, `error` (`TransactionStatus`).
- Halaman memiliki state loading (skeleton), empty, dan error dengan tombol
  retry.
- Layout responsif: grid yang menyesuaikan (`sm:`, `lg:`), padding horizontal
  `px-4 ... sm:px-8`, max-width container.
- Teks dan kontras mengikuti palette TaniTrace yang ada; tidak ada perubahan
  desain visual di dokumen ini.
- Kartu bagikan (ShareCampaignCard) menampilkan QR code dan salin tautan,
  dengan peringatan bila host adalah localhost.

## 10. Batasan yang diketahui

- Tidak ada admin, pause, atau jalur upgrade.
- Tidak ada resistensi Sybil (faucet satu klaim per alamat).
- Keaslian bukti tidak diverifikasi contract; IPFS membuktikan kecocokan
  konten terhadap referensi, bukan kebenaran isi atau penggunaan dana.
- `getCampaign` mengembalikan array `contributors` dan `requestIds` penuh
  (pertumbuhan tak terbatas; list views ber-paginasi, detail satu campaign
  dibaca utuh).
- `releasedTotal` mencakup refund.
- Contract belum diaudit; MVP hackathon, jangan dipakai untuk dana sungguhan.
- AI advisory dapat salah, tidak memverifikasi keaslian, dan tidak pernah
  menjadi keputusan on-chain. Output model dinormalisasi server-side dan tidak
  masuk `manifestHash`.
- Rate limit advisory hanya in-memory per proses server; bukan perlindungan
  kuota produksi.
- TANI tidak memiliki nilai uang; pengguna membayar gas dalam MON.
- Query event RPC publik dapat memiliki batas rentang blok; frontend memakai
  `NEXT_PUBLIC_DEPLOY_BLOCK` dan pagination.
- Sisa escrow yang tidak pernah diajukan tetap berada di contract dan tidak
  dapat diambil sepihak.
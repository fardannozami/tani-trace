# Skrip Demo TaniTrace (2–3 Menit)

Skrip runnable untuk demo v2 di Monad Testnet. Semua data sintetis; TANI adalah
token simulasi tanpa nilai uang; pengguna membayar gas dalam MON.

## 0. Checklist persiapan

- [ ] Alamat ter-deploy di `apps/web/.env.local`: `NEXT_PUBLIC_TOKEN_ADDRESS`,
      `NEXT_PUBLIC_FUNDING_ADDRESS`, `NEXT_PUBLIC_FAUCET_ADDRESS`,
      `NEXT_PUBLIC_DEPLOY_BLOCK`.
- [ ] Faucet terisi TANI (deploy script mentransfer `FAUCET_ALLOCATION`,
      default 200000 TANI).
- [ ] Tiga wallet di Monad Testnet (chainId 10143): petani, investor A,
      investor B; masing-masing memiliki MON untuk gas.
- [ ] Frontend di-restart setelah perubahan env (`cd apps/web && npm run dev`).
- [ ] Untuk time warp lokal: Foundry `cast` tersedia.

## 1. Urutan scene (total ~2,5 menit)

| # | Scene | Durasi |
|---|---|---|
| 1 | Klaim TANI di `/faucet` | 15s |
| 2 | Buat campaign di `/campaigns/new` | 20s |
| 3 | Kontribusi dari dua wallet hingga target → Aktif | 25s |
| 4 | Upload bukti + ajukan pencairan di `/dashboard` | 25s |
| 5 | Manifest hash + voting YES di request page | 25s |
| 6 | Time warp 24 jam + finalisasi → Approved | 20s |
| 7 | Pay disbursement → Paid | 15s |
| 8 | Close cycle → Selesai di `/dashboard` | 15s |
| 9 | Feed audit di `/audit` | 15s |
| 10 | (Opsional) Jalur refund pada campaign kedua yang gagal | 30s |

### Scene 1 — `/faucet` klaim TANI (15s)

- URL: `http://localhost:3000/faucet`
- Aksi: hubungkan wallet petani, investor A, investor B secara bergantian;
  tekan "Klaim".
- Hasil on-chain: `claim` pada `TANIFaucet`; event `Claimed`;
  saldo TANI bertambah; satu klaim per alamat.
- Katakan: "TANI adalah token simulasi testnet; setiap wallet klaim satu kali;
  gas dibayar dalam MON."

### Scene 2 — `/campaigns/new` buat campaign (20s)

- URL: `http://localhost:3000/campaigns/new`
- Aksi: isi judul, jenis tanaman, lokasi, target TANI kecil (cukup 2
  kontribusi), deadline di masa depan, rencana dana; kirim `createCampaign`.
- Hasil on-chain: `CampaignCreated(campaignId, farmer, title, targetAmount,
  fundingDeadline)`; status `FUNDING`.
- Katakan: "Campaign dibuat on-chain dengan target dan deadline; belum ada dana
  terkunci sampai ada kontribusi."

### Scene 3 — kontribusi hingga target → Aktif (25s)

- URL: `http://localhost:3000/campaigns/[campaignId]`
- Aksi: investor A dan B menyetujui allowance TANI ke `TaniTraceFunding`, lalu
  `contribute` dari masing-masing hingga `totalRaised == targetAmount`.
- Hasil on-chain: `ContributionMade` per kontributor; saat target tercapai
  `CampaignActivated(campaignId, totalRaised, activatedAt)`; status `ACTIVE`;
  kontribusi ditutup.
- Katakan: "Target tercapai, campaign otomatis aktif; kontribusi tercatat
  menjadi bobot voting."
- Kartu "Bagikan campaign" menampilkan QR dan tautan halaman. Peserta demo
  dapat memindai QR untuk membuka campaign di perangkat lain. Jika host masih
  `localhost`, gunakan IP LAN atau URL publik agar QR dapat diakses.

### Scene 4 — `/dashboard` upload bukti + ajukan pencairan (25s)

- URL: `http://localhost:3000/dashboard`
- Aksi: pilih campaign aktif; unggah berkas (JPEG/PDF) ke IPFS (upload API);
  isi nominal, tujuan, CID bukti; kirim `requestDisbursement`.
- Hasil on-chain: `DisbursementRequested(requestId, campaignId, farmer, amount,
  purpose, evidenceCid, manifestHash, votingDeadline)`; status `PENDING`;
  `pendingRequestId` terisi.
- Catatan: dua langkah — upload berkas (off-chain) lalu transaksi on-chain.
  Setelah upload, bila `GEMINI_API_KEY` terisi, muncul kartu "Pemeriksaan awal
  (advisory)" dari model; hasil ini tidak memblokir transaksi dan tidak on-chain.
- Katakan: "Upload dulu ke IPFS. Kalau aktif, AI hanya memberi catatan awal —
  keputusan tetap di voting dan contract."

### Scene 5 — request page: manifest hash + voting YES (25s)

- URL: `http://localhost:3000/campaigns/[campaignId]/requests/[requestId]`
- Aksi: tampilkan `manifestHash` on-chain dan verifikasi bundel IPFS; investor A
  dan B memilih YES (`vote(requestId, true)`).
- Hasil on-chain: `VoteCast(requestId, campaignId, voter, true, weight)` per
  voter; `yesWeight` bertambah sesuai kontribusi tercatat.
- Katakan: "Bobot suara sama dengan kontribusi tercatat; hash manifest dapat
  diverifikasi ulang di frontend."

### Scene 6 — time warp 24 jam + finalisasi → Approved (20s)

- URL: halaman request yang sama (atau terminal untuk time warp).
- Aksi lokal: `cast rpc evm_increaseTime 86401` lalu `cast rpc evm_mine`;
  siapa pun memanggil `finalizeRequest(requestId)`.
- Hasil on-chain: `RequestFinalized(requestId, campaignId, APPROVED,
  yesWeight, noWeight)` (bila kuorum tercapai dan YES > NO); status
  `APPROVED`; `approvedRequestId` terisi.
- Katakan: "Finalisasi permissionless setelah 24 jam; kuorum dan mayoritas
  ditegakkan contract."

### Scene 7 — pay disbursement → Paid (15s)

- URL: halaman request atau detail campaign.
- Aksi: petani memanggil `payDisbursement(requestId)`.
- Hasil on-chain: `DisbursementPaid(requestId, campaignId, farmer, amount)`;
  status `PAID`; `releasedTotal` bertambah; transfer TANI satu kali ke petani.
- Katakan: "Pencairan satu kali; nominal persis yang disetujui."

### Scene 8 — `/dashboard` close cycle → Selesai (15s)

- URL: `http://localhost:3000/dashboard`
- Aksi: petani memanggil `completeCampaign(campaignId)` (hanya jika tidak ada
  pengajuan aktif maupun approved yang belum dibayar).
- Hasil on-chain: `CampaignCompleted(campaignId, farmer, releasedTotal)`; status
  `COMPLETED`.
- Katakan: "Siklus ditutup; sisa escrow yang tidak diajukan tetap di contract."

### Scene 9 — `/audit` feed event (15s)

- URL: `http://localhost:3000/audit`
- Aksi: buka feed audit; filter kelompok event.
- Hasil: daftar event on-chain (`CampaignCreated`, `ContributionMade`,
  `CampaignActivated`, `DisbursementRequested`, `VoteCast`,
  `RequestFinalized`, `DisbursementPaid`, `CampaignCompleted`) didekode dari
  log, tanpa database.
- Katakan: "Semua aksi tercatat publik dan dapat diaudit ulang."

### Scene 10 — (opsional) jalur refund (30s)

- URL: `/campaigns/new` lalu `/refund`
- Aksi: buat campaign kedua dengan satu kontribusi di bawah target; warp waktu
  melewati deadline; buka `/refund`; kontributor memanggil `claimRefund`.
- Hasil on-chain: campaign menjadi `FAILED` (via `finalizeCampaign` atau
  transisi malas di `claimRefund`); `RefundClaimed(campaignId, contributor,
  amount)`; `releasedTotal` bertambah; satu klaim per wallet.
- Katakan: "Campaign gagal mengembalikan dana kontributor; refund satu kali."

## 2. Yang tidak boleh diklaim

- Tidak ada resistensi Sybil; faucet satu klaim per alamat bukan perlindungan
  Sybil.
- Contract belum diaudit.
- Contract tidak menjamin keaslian bukti atau penggunaan dana; IPFS hanya
  membuktikan kecocokan konten terhadap referensi.
- TANI tidak memiliki nilai uang.
- AI hanya memberi laporan advisory; hasilnya dapat salah, tidak disimpan
  on-chain, dan tidak boleh diklaim sebagai verifikasi keaslian. Tanpa
  `GEMINI_API_KEY`, kartu advisory tidak muncul dan alur tetap berjalan.
- Tidak ada admin, pause, atau upgrade path.

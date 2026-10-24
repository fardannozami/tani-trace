# TaniTrace --- Dokumen Kebutuhan Produk (PRD)

**Versi:** 2.0\
**Status:** Spesifikasi MVP hackathon\
**Jaringan:** Monad Testnet (chainId 10143)\
**Jenis produk:** Protokol pendanaan pertanian on-chain\
**Tagline:** *Pendanaan pertanian transparan, pencairan disetujui
investor secara on-chain.*

> Dokumen ini adalah spesifikasi v2.0 yang sudah diselaraskan dengan aplikasi
> yang berjalan di repo ini. Penyesuaian terhadap draf awal bersifat klarifikasi
> teknis (field pengajuan, batas string, alur upload, advisory AI, route, dan
> environment) dan tidak mengubah aturan ekonomi inti: voting 40 detik pada mode demo, kuorum
> 50%, satu pengajuan aktif per campaign, dan pencairan satu kali.

## 1. Ringkasan Produk

TaniTrace adalah protokol pendanaan pertanian transparan yang
memungkinkan petani memperoleh pendanaan simulasi testnet untuk
kebutuhan selama masa tanam. Petani mengajukan pencairan ketika
membutuhkan dana untuk persiapan lahan, benih, pupuk, irigasi, tenaga
kerja, dan kegiatan budidaya lainnya. Investor yang mendanai campaign
memberikan suara pada setiap pengajuan. Smart contract menegakkan hasil
voting dan mencairkan dana dari escrow jika persyaratan terpenuhi.

Kontribusi, pengajuan, voting, referensi bukti, dan pencairan dicatat di
Monad. Foto dan dokumen pendukung disimpan di IPFS. Pemeriksaan awal
berbasis AI tersedia sebagai advisory opsional; hasilnya tidak pernah
menjadi keputusan on-chain. Produk ini tidak mengklaim bahwa blockchain
dapat memverifikasi kejadian dunia nyata secara mandiri atau membuktikan
bagaimana petani menggunakan dana.

**One-liner:** TaniTrace adalah protokol pendanaan pertanian transparan
yang memungkinkan petani mengajukan dana sesuai kebutuhan selama masa
tanam, dengan pencairan yang disetujui melalui voting investor secara
on-chain.

## 2. Masalah yang Diselesaikan

Petani dapat membutuhkan pendanaan pada tahap budidaya yang berbeda,
sementara pemberi dana mungkin kesulitan melihat secara jelas dan dapat
diaudit: - jumlah dana yang terkumpul untuk suatu campaign; - kebutuhan
tambahan yang diajukan petani beserta alasannya; - investor yang
mendukung atau menolak pengajuan; - nominal dan waktu pencairan; serta -
bukti yang diajukan untuk mendukung setiap permintaan dana.

TaniTrace menyediakan jejak audit publik dan proses pencairan yang
dikendalikan investor. Produk ini merupakan prototipe koordinasi
pendanaan yang transparan, bukan jaminan keberhasilan panen atau imbal
hasil investasi.

## 3. Tujuan Produk

-   Memungkinkan petani membuat campaign pendanaan dengan target dan
    deadline.
-   Memungkinkan investor mendanai campaign menggunakan token ERC-20
    TNC simulasi di Monad Testnet.
-   Menyediakan faucet TNC testnet dengan satu klaim per alamat untuk
    keperluan demo.
-   Memungkinkan petani mengajukan pencairan sesuai kebutuhan selama
    masa tanam.
-   Memungkinkan investor campaign melakukan voting untuk setiap
    pengajuan, dengan bobot berdasarkan kontribusi yang tercatat.
-   Mencairkan dana yang disetujui dari escrow smart contract hanya
    setelah aturan voting terpenuhi.
-   Menyimpan bukti pendukung di IPFS dan mencatat CID/hash-nya pada
    pengajuan on-chain.
-   Menampilkan aktivitas yang bisa diaudit dari state dan event smart
    contract.
-   Berjalan tanpa backend permanen atau database.

## 4. Di Luar Cakupan

-   Penggalangan dana dengan uang sungguhan, produk investasi, yield,
    atau janji imbal hasil.
-   Verifikasi identitas atau pencegahan Sybil tingkat produksi.
-   Jaminan bahwa foto, nota, atau klaim yang dikirim adalah benar.
-   Pencairan otomatis yang dipicu oleh panen.
-   Backend terpusat atau database permanen.
-   AI sebagai pemegang keputusan final pencairan. AI hanya boleh
    memberi laporan advisory yang tidak memblokir upload maupun
    transaksi.
-   Jaminan bahwa laporan advisory AI benar, lengkap, atau bebas dari
    kesalahan.
-   Transaksi tanpa gas. Pengguna membayar gas testnet menggunakan MON.

## 5. Pengguna dan Peran

### Petani

Membuat campaign, menjelaskan rencana penggunaan dana, mengirim bukti,
mengajukan pencairan, mencairkan pengajuan yang disetujui, dan menutup
campaign setelah siklus budidaya selesai.

### Investor / Kontributor

Menyetor TNC ke campaign, memeriksa pengajuan dan bukti, lalu memilih
YES atau NO untuk setiap pengajuan pencairan.

### Pengamat Publik

Melihat perkembangan campaign, aktivitas pendanaan, hasil pengajuan,
referensi bukti, dan tautan transaksi tanpa harus menjadi investor.

## 6. Ruang Lingkup dan Alur Pengguna

### 6.1 Membuat Campaign

1.  Petani menghubungkan wallet pada Monad Testnet.
2.  Petani mengisi judul campaign, jenis tanaman, lokasi, rencana
    penggunaan dana, target pendanaan, dan deadline pendanaan.
3.  Petani mengirim transaksi `createCampaign` (tidak ada upload IPFS
    pada tahap ini).
4.  Contract menyimpan campaign dengan status `FUNDING` dan mencatat
    `createdAt`.

Batas panjang field on-chain: judul 96 karakter, jenis tanaman 48,
lokasi 120, rencana 600. Target harus lebih besar dari nol dan deadline
harus di masa depan.

### 6.2 Mendanai Campaign

1.  Investor menghubungkan wallet dan mengklaim TNC testnet dari
    faucet. Jumlah klaim default 100 TNC per alamat, satu kali.
2.  Investor menyetujui allowance agar contract pendanaan dapat
    menggunakan TNC.
3.  Investor menyetor TNC selama campaign berstatus `FUNDING` dan
    sebelum deadline. Nominal kontribusi tidak boleh melebihi sisa
    target.
4.  Contract mencatat kontribusi per wallet dan memperbarui
    `totalRaised`. Transfer yang memotong fee (fee-on-transfer) ditolak
    agar akuntansi escrow tetap 1:1.
5.  Tepat ketika `totalRaised == targetAmount`, campaign berubah menjadi
    `ACTIVE` pada transaksi yang sama dan kontribusi ditutup.

### 6.3 Mengajukan Pencairan

1.  Petani mengirim pengajuan ketika campaign berstatus `ACTIVE`, tidak
    ada pengajuan yang sedang voting, dan tidak ada pengajuan `APPROVED`
    yang belum dibayar.
2.  Pengajuan on-chain mencakup `amount`, `purpose` (maksimum 96
    karakter), dan `evidenceCid` (maksimum 128 karakter). Deskripsi
    rinci, daftar berkas, dan catatan berada di manifest IPFS, bukan
    sebagai field on-chain terpisah.
3.  Sebelum transaksi, frontend mengunggah berkas bukti ke IPFS,
    menyusun manifest JSON, lalu memakai CID manifest sebagai
    `evidenceCid`.
4.  Nominal harus lebih besar dari nol dan tidak melebihi
    `availableEscrow = totalRaised - releasedTotal`.
5.  Contract menghitung `manifestHash` secara kanonis dari field
    pengajuan dan `requestedAt` (waktu blok), membuka voting 40 detik pada mode demo, dan
    menetapkan status `PENDING`.

### 6.4 Voting dan Finalisasi

-   Investor memilih `YES` atau `NO` sebelum `votingDeadline`.
-   Hanya alamat dengan kontribusi tercatat pada campaign tersebut yang
    boleh memilih; bobotnya sama dengan kontribusi tercatat, bukan saldo
    wallet saat ini.
-   Setiap alamat hanya dapat memilih satu kali per pengajuan.
-   Kuorum dihitung dengan pembulatan ke atas: total bobot suara
    minimal 50% dari `totalRaised`.
-   Pengajuan disetujui hanya jika kuorum tercapai dan bobot YES lebih
    besar daripada bobot NO.
-   Tanpa kuorum, termasuk jika tidak ada suara sama sekali, pengajuan
    menjadi `EXPIRED`.
-   Dengan kuorum tetapi YES tidak lebih besar daripada NO (termasuk
    seri), pengajuan menjadi `REJECTED`.
-   Alamat mana pun boleh memanggil `finalizeRequest` setelah deadline
    voting; hasilnya deterministik dan tidak bergantung pada admin.

### 6.5 Mencairkan Pengajuan yang Disetujui

1.  Setelah pengajuan berstatus `APPROVED`, petani pemilik pengajuan
    memanggil `payDisbursement`.
2.  Contract memeriksa bahwa pemanggil adalah `request.farmer`, status
    pengajuan masih `APPROVED`, campaign masih `ACTIVE`, dan escrow
    mencukupi.
3.  Contract menetapkan status `PAID`, mengosongkan
    `approvedRequestId`, dan menambah `releasedTotal` sebelum transfer.
4.  Contract mentransfer tepat sebesar nominal yang disetujui; pencairan
    kedua tidak mungkin terjadi.

### 6.6 Refund Campaign Gagal

-   Jika target tidak tercapai sampai deadline, campaign dapat menjadi
    `FAILED` melalui `finalizeCampaign` (permissionless) atau transisi
    malas saat kontributor memanggil `claimRefund`.
-   Setiap kontributor dapat mengklaim kembali kontribusinya yang
    tercatat satu kali.
-   Refund tidak tersedia untuk campaign yang berhasil didanai.
-   Campaign `FAILED` tidak pernah mencairkan dana, sehingga jalur refund
    dan pencairan tidak menggunakan dana escrow yang sama.

### 6.7 Menutup Campaign

Petani dapat memanggil `completeCampaign` setelah siklus budidaya
selesai, dengan syarat campaign berstatus `ACTIVE`, tidak ada pengajuan
aktif, dan tidak ada pengajuan `APPROVED` yang belum dibayar. Penutupan
adalah tindakan pelaporan/siklus produk, bukan pemicu pencairan panen.
Sisa escrow yang tidak pernah diajukan tetap berada di contract dan
tidak dapat diambil sepihak.

### 6.8 Pemeriksaan Awal Bukti (AI Advisory)

Fitur ini opsional dan tidak pernah menjadi keputusan on-chain.

1.  Setelah berkas bukti diunggah ke IPFS dan sebelum manifest di-pin,
    frontend memanggil route server `POST /api/evidence/advisory`.
2.  Route memakai otorisasi yang sama dengan upload: nonce, tanda tangan
    EIP-191, dan token HMAC. Tidak ada kredensial model di browser.
3.  Model vision (Gemini, default `gemini-2.5-flash`, dapat diatur lewat
    `GEMINI_MODEL`) menilai konsistensi visual berkas dengan tujuan dan
    nominal pengajuan. Hanya JPEG, PNG, dan PDF yang diperiksa;
    maksimum 4 berkas, 4 MB per berkas, 8 MB total.
4.  Output model divalidasi dan dinormalisasi server-side menjadi
    `verdict` (`consistent`/`unclear`/`suspicious`), `summary`,
    `findings`, `checkedAt`, `model`, dan disclaimer konstan.
5.  Hasil disimpan di manifest IPFS sebagai field opsional `advisory`.
    Field ini tidak termasuk preimage `manifestHash` dan tidak pernah
    ditulis on-chain.
6.  Jika `GEMINI_API_KEY` tidak diisi (`AI_NOT_CONFIGURED`) atau model
    gagal/timeout (`AI_FAILED`), unggahan tetap berhasil dan transaksi
    tetap dapat dikirim. UI hanya menampilkan catatan bahwa pemeriksaan
    awal tidak tersedia.
7.  Route membatasi 6 permintaan per 10 menit per alamat dengan
    penghitung in-memory. Ini bukan rate limit produksi.
8.  Laporan yang dibaca kembali dari bundel IPFS ditandai sebagai isi
    bundel yang tidak diverifikasi ulang, karena manifest diunggah oleh
    pemohon.

## 7. State Machine

### 7.1 Status Campaign

-   `FUNDING`: kontribusi diterima sampai target tercapai atau deadline
    habis.
-   `ACTIVE`: target tercapai; petani dapat mengajukan pencairan.
-   `FAILED`: deadline lewat sebelum target tercapai; kontributor dapat
    melakukan refund.
-   `COMPLETED`: petani menutup siklus budidaya setelah semua kewajiban
    selesai.

Transisi:

-   `FUNDING → ACTIVE` ketika target tercapai (otomatis di `contribute`)
    atau ketika `finalizeCampaign` menemukan target sudah tercapai.
-   `FUNDING → FAILED` ketika deadline lewat dan target belum tercapai
    (`finalizeCampaign` atau transisi malas di `claimRefund`).
-   `ACTIVE → COMPLETED` ketika petani menutup campaign dan tidak ada
    pengajuan aktif atau `APPROVED` yang belum dibayar.

### 7.2 Status Pengajuan Pencairan

-   `PENDING`: voting berlangsung.
-   `APPROVED`: voting ditutup, kuorum tercapai, dan bobot YES \> bobot
    NO.
-   `REJECTED`: voting ditutup, kuorum tercapai, tetapi YES tidak lebih
    besar daripada NO (termasuk seri).
-   `EXPIRED`: voting ditutup tanpa kuorum, termasuk tanpa suara.
-   `PAID`: nominal yang disetujui sudah ditransfer kepada petani.

Transisi:

-   `PENDING → APPROVED | REJECTED | EXPIRED` melalui `finalizeRequest`.
-   `APPROVED → PAID` melalui `payDisbursement`.

Pengajuan yang ditolak atau kedaluwarsa tidak dapat dicairkan. Petani
dapat mengajukan permintaan baru setelah pengajuan sebelumnya mencapai
status akhir.

## 8. Aturan Pendanaan dan Voting

-   Unit nominal adalah TNC dengan 18 decimals.
-   Durasi voting: 40 detik pada deployment demo (`VOTING_PERIOD`).
-   Kuorum: 50% dari `totalRaised`, dibulatkan ke atas
    (`QUORUM_BPS = 5000`, `BPS_DENOMINATOR = 10000`).
-   Persetujuan: bobot YES harus lebih besar daripada bobot NO.
-   Bobot voting: kontribusi investor yang tercatat pada campaign
    terkait.
-   Satu suara per alamat untuk setiap pengajuan.
-   Bobot tidak didasarkan pada saldo TNC wallet saat ini.
-   Campaign hanya menerima kontribusi saat `FUNDING`; setelah `ACTIVE`,
    bobot voting tidak berubah.
-   Hanya boleh ada satu pengajuan yang sedang voting dan satu pengajuan
    `APPROVED` yang belum dibayar pada satu campaign.
-   Nominal pengajuan tidak boleh melebihi saldo escrow yang tersedia.
-   Parameter ditetapkan sebagai konstanta atau nilai immutable saat
    deployment; tidak ada owner, admin, atau pause.

## 9. Kebutuhan Smart Contract

### 9.1 `TANIToken.sol`

-   ERC-20 bernama "Tani Token" dengan simbol "TNC" dan 18 decimals.
-   Supply tetap 1.000.000 TNC (`INITIAL_SUPPLY`), dicetak sekali saat
    deployment kepada `initialHolder` (deployer).
-   Tidak ada fungsi mint publik, owner, admin, atau pause.
-   Token tidak memiliki nilai dunia nyata atau penukaran yang
    dijanjikan.

### 9.2 `TANIFaucet.sol`

-   Menyimpan alokasi TNC yang diisi saat deployment oleh script deploy
    (default 200.000 TNC).
-   Satu klaim per alamat (`hasClaimed`).
-   Jumlah klaim immutable, ditetapkan saat deployment (default 100
    TNC), dan harus lebih besar dari nol.
-   Memancarkan `Claimed(account, amount)`; error: `AlreadyClaimed`,
    `FaucetEmpty`, `ZeroAddress`, `ZeroClaimAmount`.
-   Pengguna tetap membutuhkan MON untuk gas.
-   Satu klaim per wallet bukan perlindungan Sybil yang kuat.

### 9.3 `TaniTraceFunding.sol`

Fungsi tulis:

-   `createCampaign(title, cropType, location, plan, targetAmount,
    fundingDeadline)`.
-   `contribute(campaignId, amount)`.
-   `finalizeCampaign(campaignId)` --- permissionless setelah deadline.
-   `requestDisbursement(campaignId, amount, purpose, evidenceCid)`.
-   `vote(requestId, support)`.
-   `finalizeRequest(requestId)` --- permissionless setelah deadline.
-   `payDisbursement(requestId)`.
-   `claimRefund(campaignId)`.
-   `completeCampaign(campaignId)`.

Fungsi baca dan paginasi:

-   `getCampaign`, `getRequest`, `getVote`, `availableEscrow`.
-   `getCampaignIds`, `getContributors`, `getCampaignRequestIds` dengan
    `offset`/`limit`; `limit` dibatasi `MAX_PAGE_SIZE = 100`.
-   `computeManifestHash(...)` --- pure, dapat direproduksi frontend.

Konstanta dan batas:

| Konstanta | Nilai |
|---|---|
| `VOTING_PERIOD` | 40 detik (demo) |
| `QUORUM_BPS` / `BPS_DENOMINATOR` | 5000 / 10000 |
| `MAX_TITLE_LENGTH` | 96 |
| `MAX_CROP_TYPE_LENGTH` | 48 |
| `MAX_LOCATION_LENGTH` | 120 |
| `MAX_PLAN_LENGTH` | 600 |
| `MAX_PURPOSE_LENGTH` | 96 |
| `MAX_CID_LENGTH` | 128 |
| `MAX_PAGE_SIZE` | 100 |

Persyaratan keamanan:

-   Gunakan OpenZeppelin `SafeERC20` dan `ReentrancyGuard`.
-   Validasi ID campaign/pengajuan, hak pemanggil, deadline, status,
    nominal, panjang string, dan saldo tersedia.
-   Perbarui state sebelum transfer token eksternal
    (checks-effects-interactions).
-   Cegah voting ganda, pencairan ganda, refund ganda, serta konflik
    antara refund dan pencairan.
-   Terapkan satu pengajuan aktif dan satu pengajuan `APPROVED` belum
    dibayar per campaign.
-   Larang penutupan campaign ketika masih ada pengajuan atau kewajiban
    pencairan yang belum selesai.
-   Hindari loop on-chain tanpa batas pada fungsi tulis; daftar
    kontributor dan pengajuan hanya dibaca lewat view ber-paginasi.
-   Tolak transfer token yang tidak sesuai nominal (fee-on-transfer).
-   Tambahkan unit, fuzz, dan invariant test untuk revert dan transisi
    state.

## 10. Bukti dan IPFS

### 10.1 Upload

-   Frontend meminta nonce ke `POST /api/upload/nonce`, menandatangani
    pesan otorisasi dengan wallet (EIP-191), lalu mengirim berkas ke
    `POST /api/upload` bersama token HMAC.
-   Batas upload: 4 MB per berkas, 8 MB per bundel. Tipe yang diterima:
    JPEG, PNG, PDF, dan JSON (JSON dipakai untuk manifest).
-   Credential Pinata (`PINATA_JWT`, `PINATA_GATEWAY`) dan
    `UPLOAD_SIGNING_SECRET` hanya ada di server.

### 10.2 Manifest

Manifest diserialisasi kanonis dan diunggah sebagai JSON. Bentuknya:

```json
{
  "schema": "TaniTrace.DisbursementManifest.v1",
  "campaignId": "1",
  "purpose": "Benih",
  "amount": "100000000000000000000",
  "requestedBy": "0x...",
  "createdAt": "1700000000",
  "files": [
    {
      "name": "nota.jpg",
      "cid": "bafy...",
      "size": 12345,
      "type": "image/jpeg",
      "contentHash": "0x..."
    }
  ],
  "notes": "opsional",
  "advisory": {
    "advisory": true,
    "model": "gemini-2.5-flash",
    "checkedAt": "2026-10-24T00:00:00.000Z",
    "verdict": "consistent",
    "summary": "...",
    "findings": [{ "label": "...", "status": "ok", "detail": "..." }],
    "disclaimer": "..."
  }
}
```

`advisory` bersifat opsional dan bukan bagian dari hash.

### 10.3 Hash Manifest

Preimage on-chain:

```
keccak256(abi.encode(
  MANIFEST_DOMAIN,            // keccak256("TaniTrace.DisbursementManifest.v1")
  campaignId, requestId, farmer, amount, purpose, evidenceCid, requestedAt
))
```

`requestedAt` adalah `block.timestamp` saat pengajuan, bukan `createdAt`
di manifest. Frontend mereproduksi hash dengan viem
(`computeManifestHash`) dan membandingkannya dengan
`request.manifestHash` (`verifyManifestHash`). Fixture parity:
`0xaf89b7ca7cd832e2ebbc4f8be8de531b3b698d9a0887b2a585d3ee0bf1ffbeb9`.

`evidenceCid` adalah CID bundel JSON bukti di IPFS, bukan hash byte JSON
yang dicatat on-chain. `manifestHash` membuktikan field pengajuan tidak
berubah; `evidenceCid` menunjuk bundel berkas yang dapat diperiksa.

### 10.4 Verifikasi di Frontend

-   Halaman pengajuan menghitung ulang hash dari field on-chain dan
    membandingkannya dengan `manifestHash`.
-   Metadata bundel (campaignId, tujuan, nominal, petani) dicocokkan
    dengan state contract.
-   Setiap berkas dapat dibuka lewat gateway IPFS.
-   CID/hash membuktikan kecocokan konten terhadap referensi yang
    tercatat, bukan kebenaran isi atau verifikasi independen.

## 11. Kebutuhan Frontend

Halaman yang tersedia:

| Route | Fungsi |
|---|---|
| `/` | Landing page dan ringkasan protokol. |
| `/campaigns` | Daftar campaign dengan paginasi dan filter status. |
| `/campaigns/new` | Form pembuatan campaign. |
| `/campaigns/[campaignId]` | Detail campaign, kontribusi dengan allowance TNC, kartu bagikan QR/tautan, daftar pengajuan, finalisasi campaign, pencairan pengajuan `APPROVED`, dan penutupan campaign. |
| `/dashboard` | Dashboard petani: campaign milik wallet, unggah bukti, dan ajukan pencairan. |
| `/campaigns/[campaignId]/requests/[requestId]` | Detail pengajuan: bukti IPFS, verifikasi hash manifest, bobot voting, countdown, voting, finalisasi pengajuan, hasil, dan pencairan. |
| `/audit` | Feed audit dari event on-chain dengan hash transaksi dan tautan explorer. |
| `/refund` | Klaim refund untuk campaign `FAILED`. |
| `/faucet` | Klaim TNC testnet satu kali per alamat. |

Kebutuhan lintas halaman:

-   Status wallet dan jaringan (Monad Testnet, chainId 10143) terlihat
    jelas; transaksi di chain lain ditolak sebelum dikirim.
-   Error contract ditampilkan dalam bahasa Indonesia yang dapat
    ditindaklanjuti.
-   Semua penulisan contract melalui `useContractTx`: cek chain,
    `estimateGas` + 10% gas limit, tanpa retry otomatis.
-   Nominal ditampilkan dalam TNC; gas ditampilkan dalam MON.
-   Data dashboard berasal dari pembacaan state dan event on-chain; cache
    lokal opsional dan bukan sumber kebenaran.

## 12. Arsitektur Teknis

-   Frontend: Next.js 16 (App Router) + React 19 + TypeScript +
    Tailwind CSS.
-   Interaksi wallet dan kontrak: wagmi 2 + viem 2.
-   Smart contract: Solidity 0.8.24, Foundry, OpenZeppelin.
-   Chain: Monad Testnet, chainId 10143.
-   Token: ERC-20 TNC simulasi.
-   Bukti: IPFS melalui Pinata.
-   Sumber data: state kontrak dan event on-chain.
-   Backend/database: tidak diperlukan secara permanen.
-   Route serverless stateless:
    -   `POST /api/upload/nonce` --- nonce dan token HMAC.
    -   `POST /api/upload` --- verifikasi tanda tangan dan relay ke
        Pinata.
    -   `POST /api/evidence/advisory` --- pemeriksaan awal AI (opsional,
        advisory).
    Route ini tidak menyimpan data bisnis.

### 12.1 Environment

| Variabel | Lokasi | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_MONAD_TESTNET_RPC` | `apps/web/.env.local` | RPC Monad Testnet |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | `apps/web/.env.local` | Alamat TANIToken |
| `NEXT_PUBLIC_FUNDING_ADDRESS` | `apps/web/.env.local` | Alamat TaniTraceFunding |
| `NEXT_PUBLIC_FAUCET_ADDRESS` | `apps/web/.env.local` | Alamat TANIFaucet |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | `apps/web/.env.local` | Blok deployment untuk rentang `getLogs` |
| `NEXT_PUBLIC_IPFS_GATEWAY` | `apps/web/.env.local` | Gateway IPFS |
| `PINATA_JWT` | server-only | JWT Pinata |
| `PINATA_GATEWAY` | server-only | Gateway Pinata |
| `UPLOAD_SIGNING_SECRET` | server-only | Secret HMAC upload |
| `GEMINI_API_KEY` | server-only, opsional | Kunci Gemini; kosong = advisory dilewati |
| `GEMINI_MODEL` | server-only, opsional | Default `gemini-2.5-flash` |
| `PRIVATE_KEY` | `contracts/.env` | Private key deployer |
| `MONAD_TESTNET_RPC` | `contracts/.env` | RPC untuk Foundry |
| `FAUCET_CLAIM_AMOUNT` | `contracts/.env`, opsional | TNC per klaim (default 100) |
| `FAUCET_ALLOCATION` | `contracts/.env`, opsional | Alokasi faucet (default 200000) |
| `DEPLOYMENT_OUT` | `contracts/.env`, opsional | Path output deploy (default `../deployments/monadTestnet.json`) |

Variabel `NEXT_PUBLIC_*` ter-inline ke bundel browser; jangan menaruh
secret pada prefix tersebut. Environment dibaca saat startup, sehingga
Next.js harus di-restart setelah perubahan.

## 13. Event Penting

Event yang dipancarkan `TaniTraceFunding`:

-   `CampaignCreated(campaignId, farmer, title, targetAmount,
    fundingDeadline)`.
-   `ContributionMade(campaignId, investor, amount, totalRaised)`.
-   `CampaignActivated(campaignId, totalRaised, activatedAt)`.
-   `CampaignFailed(campaignId, totalRaised)`.
-   `DisbursementRequested(requestId, campaignId, farmer, amount,
    purpose, evidenceCid, manifestHash, votingDeadline)`.
-   `VoteCast(requestId, campaignId, voter, support, weight)`.
-   `RequestFinalized(requestId, campaignId, status, yesWeight,
    noWeight)`.
-   `DisbursementPaid(requestId, campaignId, farmer, amount)`.
-   `RefundClaimed(campaignId, contributor, amount)`.
-   `CampaignCompleted(campaignId, farmer, releasedTotal)`.

`TANIFaucet` memancarkan `Claimed(account, amount)`.

Event menyertakan ID campaign/pengajuan dan alamat wallet; field yang
relevan diberi index agar feed audit dapat difilter.

## 14. Acceptance Criteria

### Campaign dan pendanaan

-   Petani dapat membuat campaign dengan target dan deadline.
-   Investor dapat berkontribusi dengan TNC dan bobot kontribusinya
    tercatat dengan benar.
-   Kontribusi tidak boleh melebihi sisa target.
-   Campaign menjadi `ACTIVE` ketika target tercapai.
-   Campaign menjadi `FAILED` setelah deadline jika target belum
    tercapai.
-   Kontributor campaign gagal dapat refund satu kali; kontributor
    campaign sukses tidak dapat memakai jalur refund.
-   Faucet memberi satu klaim per alamat dan menolak klaim kedua.

### Pengajuan dan voting

-   Hanya petani pemilik campaign yang dapat membuat pengajuan.
-   Pengajuan memuat nominal, tujuan, CID bukti, dan hash manifest.
-   Nominal tidak boleh melebihi saldo escrow yang tersedia.
-   Hanya kontributor campaign terkait yang dapat voting.
-   Setiap alamat hanya dapat voting sekali per pengajuan.
-   Bobot suara sama dengan kontribusi campaign yang tercatat, bukan
    saldo wallet saat ini.
-   Voting ditutup setelah 40 detik pada deployment demo.
-   Aturan kuorum dan YES/NO diterapkan secara tepat, termasuk
    pembulatan kuorum ke atas dan hasil seri.
-   Pengajuan tanpa kuorum menjadi `EXPIRED`; voting yang tidak
    memenuhi persetujuan menjadi `REJECTED`.
-   Siapa pun dapat melakukan finalisasi setelah deadline.

### Pencairan dan siklus campaign

-   Hanya petani yang dapat mencairkan pengajuan yang disetujui.
-   Nominal pencairan sama dengan nominal yang disetujui.
-   Pengajuan tidak dapat dibayar dua kali.
-   Tidak boleh ada pengajuan aktif yang tumpang tindih pada satu
    campaign.
-   Campaign tidak dapat ditutup saat pengajuan atau kewajiban
    pencairan belum selesai.
-   Panen tidak memicu pencairan otomatis.
-   Jalur refund dan pencairan tidak dapat menggunakan dana escrow yang
    sama.

### Bukti, advisory, dan audit

-   CID dan hash manifest tercatat on-chain.
-   Frontend dapat membuka bukti dan memverifikasi hash terhadap
    manifest kanonis.
-   Pemeriksaan awal AI berjalan otomatis setelah upload bila
    `GEMINI_API_KEY` tersedia.
-   Hasil advisory tidak memblokir upload atau transaksi, tidak masuk
    `manifestHash`, dan tidak pernah dibaca contract.
-   Tanpa kunci model atau saat model gagal, upload tetap berhasil dan
    UI menampilkan catatan yang jelas.
-   Laporan advisory yang dibaca dari bundel IPFS ditandai sebagai isi
    bundel yang tidak diverifikasi ulang.
-   Aksi penting menghasilkan event dan tampil pada feed audit.
-   Tautan explorer tersedia untuk transaksi on-chain.
-   Fitur inti dapat berjalan tanpa backend permanen atau database.

## 15. Rencana Pengujian

Foundry (85 test: unit/integration, fuzz, invariant) mencakup:

-   Pendanaan campaign sukses dan aktivasi.
-   Deadline pendanaan habis dan refund campaign gagal.
-   Percobaan membuat campaign, pengajuan, atau pencairan tanpa hak.
-   Nominal pengajuan tidak valid dan escrow tidak mencukupi.
-   Kontribusi melebihi sisa target dan transfer fee-on-transfer.
-   Voting dari non-investor dan voting ganda.
-   Kuorum tercapai dan gagal, termasuk pembulatan ke atas.
-   Mayoritas YES, mayoritas NO, dan hasil seri.
-   Finalisasi sebelum deadline.
-   Pencairan dua kali dan refund dua kali.
-   Refund pada campaign sukses.
-   Pengajuan pada campaign failed/completed.
-   Penutupan campaign dengan pengajuan pending atau belum dibayar.
-   Reentrancy dan kegagalan transfer token.
-   Emisi event dan transisi status yang benar.
-   Invariant escrow dan paginasi view.

Frontend (35 test unit) mencakup:

-   Paritas `computeManifestHash` dengan fixture on-chain.
-   Serialisasi manifest dan invariant hash ketika `advisory` ada/tidak
    ada.
-   Normalisasi output advisory (whitelist verdict/status, batas
    panjang, disclaimer konstan).
-   Kartu bagikan campaign: URL, QR, dan peringatan localhost.
-   Utility format, tipe, dan validasi bundel.

Perintah verifikasi:

```bash
cd contracts && forge build && forge test
cd apps/web && npx tsc --noEmit && bun run lint && bun run test
cd apps/web && bunx next build
```

## 16. Narasi Demo

1.  Investor mengklaim TNC di `/faucet`.
2.  Petani membuat campaign untuk kebutuhan selama masa tanam.
3.  Dua atau lebih wallet investor menyetor TNC.
4.  Target tercapai dan campaign menjadi active.
5.  Petani mengunggah bukti ke IPFS (opsional: muncul kartu
    "Pemeriksaan awal (advisory)") lalu mengajukan nominal untuk benih
    atau pupuk.
6.  Investor memeriksa pengajuan dan memberikan suara.
7.  Setelah periode voting (atau dengan time-warp khusus dalam pengujian
    lokal), siapa pun dapat memfinalisasi pengajuan.
8.  Jika disetujui, petani mencairkan dana dan transfer terlihat
    on-chain.
9.  Dashboard menampilkan rangkaian lengkap: kontribusi → pengajuan →
    voting → hasil → pencairan.
10. Demonstrasikan pengajuan rejected/expired atau refund campaign gagal
    sebagai skenario negatif.

## 17. Risiko dan Batasan

-   Voting investor dapat dipengaruhi kepemilikan terkonsentrasi atau
    wallet yang terkoordinasi.
-   Satu alamat satu suara tidak mencegah pembuatan banyak wallet;
    voting berbobot kontribusi mengurangi tetapi tidak menghilangkan
    perilaku Sybil.
-   Bukti IPFS bukan bukti kebenaran dunia nyata.
-   Transfer ke wallet petani bukan bukti bahwa dana digunakan sesuai
    tujuan.
-   Laporan advisory AI dapat salah, tidak lengkap, atau dipengaruhi
    prompt injection dari teks di dalam berkas. Laporan tidak pernah
    menjadi keputusan on-chain.
-   Field `advisory` berada di manifest yang diunggah pemohon; pembaca
    harus memperlakukannya sebagai klaim yang tidak terverifikasi.
-   Rate limit advisory hanya in-memory per proses server, bukan
    perlindungan kuota produksi.
-   Query event RPC publik dapat memiliki batas rentang blok; frontend
    harus menggunakan pagination atau rentang terbatas
    (`NEXT_PUBLIC_DEPLOY_BLOCK`).
-   `getCampaign` mengembalikan array `contributors` dan `requestIds`
    penuh; hanya list view yang ber-paginasi.
-   Token testnet tidak dijanjikan memiliki nilai uang.
-   Smart contract perlu pengujian dan peninjauan menyeluruh; MVP
    hackathon ini belum diaudit dan tidak boleh digunakan untuk dana
    sungguhan.

## 18. Definition of Done

MVP siap demo ketika:

-   Kontrak berhasil dikompilasi dan seluruh test Foundry lulus (85
    test).
-   Test frontend, typecheck, lint, dan `next build` lulus (35 test).
-   Kontrak token, faucet, dan funding sudah dideploy ke Monad Testnet,
    dan `deployments/monadTestnet.json` berisi tiga alamat serta
    `deployedAtBlock`.
-   `apps/web/.env.local` berisi RPC, tiga alamat contract, blok
    deployment, dan gateway IPFS; Next.js di-restart setelah pengisian.
-   Frontend dapat menghubungkan wallet, membaca state kontrak, dan
    mengirim semua transaksi yang diperlukan.
-   Upload dan pengambilan bukti IPFS berjalan, termasuk verifikasi hash
    manifest.
-   Advisory AI berjalan opsional dan tidak memblokir alur tanpa
    `GEMINI_API_KEY`.
-   Alur campaign, voting, pencairan, refund, dan audit berhasil
    didemonstrasikan end-to-end.
-   README berisi instruksi setup, environment variables, alamat
    deployment, perintah test, dan batasan yang diketahui.

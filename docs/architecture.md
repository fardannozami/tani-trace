# Arsitektur TaniTrace

Smart contract adalah satu-satunya sumber kebenaran. IPFS menyimpan file dan
manifest; Next.js hanya membaca state/event dan menjadi adapter upload.

## Komponen

| Komponen | Lokasi | Peran |
|---|---|---|
| `TANIToken` | `contracts/src/TANIToken.sol` | ERC-20 "TNC", supply tetap 1.000.000e18, tanpa mint publik, tanpa owner |
| `TANIFaucet` | `contracts/src/TANIFaucet.sol` | Saldo pra-isi, satu klaim per alamat, `claimAmount` immutable |
| `TaniTraceFunding` | `contracts/src/TaniTraceFunding.sol` | Campaign, kontribusi, voting, pencairan, refund, paginasi |
| Frontend | `apps/web/` | Next.js + wagmi/viem; reads dari RPC; writes via `useContractTx` |
| API upload | `apps/web/app/api/upload/*` | Nonce (5 menit) + EIP-191 + HMAC; relay ke Pinata; server menolak tipe selain JPEG/PNG/PDF/JSON dan berkas > 4 MB; batas bundel 8 MB dicek di klien |
| Validasi bukti | `apps/web/lib/file-types.ts`, `apps/web/hooks/useIPFS.ts`, `apps/web/app/api/upload/_lib/auth.ts` | MIME/ekstensi (JPEG/PNG/PDF/JSON); 4 MB/file ditegakkan di server, 8 MB bundle dicek di klien |
| API advisory | `apps/web/app/api/evidence/advisory` | Pemeriksaan awal AI (opsional); hasil masuk manifest, bukan on-chain |
| IPFS/Pinata | off-chain | File bukti dan manifest JSON |

## Alur data

1. Petani membuat campaign (`createCampaign`) → status `FUNDING`.
2. Investor menyetor TNC (`contribute`) sebelum deadline dan sebelum target;
   saat target tercapai → `ACTIVE` dan kontribusi ditutup.
3. Jika deadline lewat di bawah target → `FAILED` (via `finalizeCampaign` atau
   lazy transition di `claimRefund`).
4. Petani mengajukan pencairan (`requestDisbursement`) saat `ACTIVE` →
   `PENDING`, voting 40 detik pada deployment demo, `manifestHash` dihitung on-chain.
5. Kontributor memilih `vote` (bobot = kontribusi tercatat).
6. Siapa pun memfinalisasi setelah deadline (`finalizeRequest`) →
   `APPROVED`/`REJECTED`/`EXPIRED` (kuorum dengan ceiling division: 50%
   dari total dana; YES > NO).
7. Jika `APPROVED`, petani memanggil `payDisbursement` → `PAID`, transfer
   satu kali.
8. Kontributor campaign `FAILED` mengklaim `claimRefund` (satu kali).
9. Petani menutup campaign (`completeCampaign`) jika tidak ada pengajuan aktif
   maupun approved yang belum dibayar → `COMPLETED`.

## Invariant contract

- Escrow per campaign: `availableEscrow = totalRaised - releasedTotal`.
- Saldo contract >= Σ(totalRaised - releasedTotal) seluruh campaign.
- `releasedTotal <= totalRaised` untuk setiap campaign.
- Pada campaign `FAILED`, tidak ada pencairan; refund menambah `releasedTotal`
  dengan jumlah kontribusi yang diklaim.
- Tidak ada dua pengajuan aktif per campaign (`pendingRequestId`/`approvedRequestId`).
- Pencairan satu kali (`APPROVED → PAID`).
- Refund satu kali per wallet (`refunded` mapping).
- Kuorum dihitung dengan pembulatan ke atas: `(totalRaised * 5000 + 9999) / 10000`.
- Manifest hash on-chain = `keccak256(abi.encode(MANIFEST_DOMAIN, campaignId,
  requestId, farmer, amount, purpose, evidenceCid, requestedAt))` dengan
  `MANIFEST_DOMAIN = keccak256("TaniTrace.DisbursementManifest.v1")`.
- Frontend mereproduksi dengan viem (`apps/web/lib/manifest.ts`); fixture parity
  `0xaf89b7ca7cd832e2ebbc4f8be8de531b3b698d9a0887b2a585d3ee0bf1ffbeb9`.
- `evidenceCid` adalah CID bundel JSON bukti di IPFS, bukan hash byte JSON
  yang dicatat on-chain.

## Trust boundary

- On-chain: status, saldo, kontribusi, voting, pencairan, refund, hash.
- Off-chain (tidak tepercaya): isi file bukti, klaim dunia nyata, laporan.
- Server (secret): Pinata JWT, HMAC secret; tidak ada aturan bisnis.
- AI: advisory, tidak pernah memengaruhi keputusan on-chain. Hasilnya disimpan
  di manifest IPFS sebagai field opsional `advisory` yang tidak ikut
  `manifestHash`; laporan dari bundel ditandai tidak terverifikasi.
- Validasi tipe MIME dan batas 4 MB/file ditegakkan server-side; batas bundel
  8 MB dicek di klien (dan di route advisory untuk berkas yang diperiksa).
- Throttle advisory 6 panggilan / 10 menit per alamat, in-memory per proses
  server.

## Mengapa tanpa backend datastore

State bisnis utama (campaign, kontribusi, pengajuan, suara, pencairan, refund)
hanya ada on-chain. Reads via `eth_call`/`getLogs`. Cache lokal opsional dan
bukan sumber kebenaran. Route serverless stateless dan tidak menyimpan data
bisnis.

## Event dan audit

Event yang dipancarkan: `CampaignCreated`, `ContributionMade`,
`CampaignActivated`, `CampaignFailed`, `DisbursementRequested`, `VoteCast`,
`RequestFinalized`, `DisbursementPaid`, `RefundClaimed`, `CampaignCompleted`.
Audit feed (`/audit`) merekonstruksi dari event on-chain dengan pagination
rentang blok (`NEXT_PUBLIC_DEPLOY_BLOCK`).

## Batasan yang diketahui

- Tidak ada admin, pause, atau upgrade path.
- `getCampaign` mengembalikan array `contributors` dan `requestIds` penuh
  (pertumbuhan tak terbatas; list views ber-paginasi, detail satu campaign
  dibaca utuh).
- Tidak ada resistensi Sybil (faucet satu klaim per alamat).
- Keaslian bukti tidak diverifikasi contract.
- `releasedTotal` mencakup refund.
- Contract belum diaudit.
- AI tidak digunakan untuk keputusan on-chain.

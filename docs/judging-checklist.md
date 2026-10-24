# TaniTrace — Judging Evidence Checklist

Dokumen ini memetakan kriteria penilaian ke bukti yang dapat ditunjukkan saat
pitch. TaniTrace memakai Monad Testnet untuk demo publik dan tidak boleh
dipresentasikan sebagai produk finansial dengan dana nyata.

## Basic points

| Kriteria | Status | Bukti |
| --- | --- | --- |
| Public GitHub repo | Siap | [github.com/fardannozami/tani-trace](https://github.com/fardannozami/tani-trace) |
| Proper README | Siap | README menjelaskan live URL, chain, alamat kontrak, setup, deploy, testing, dan disclaimer |
| Smart contracts on Monad Testnet | Siap | `deployments/monadTestnet.json` + tautan Monad Explorer di README |
| Project publicly hosted | Siap | [www.tanitrace.web.id](https://www.tanitrace.web.id/) |

## Advance points

| Kriteria | Status | Bukti / aksi demo |
| --- | --- | --- |
| Announced functions work | Siap diuji | `forge test`, fuzz, invariant, Vitest, typecheck, lint, dan `next build` |
| Live transaction on chain | Siap demo | `/faucet` → `/campaigns/new` → kontribusi → voting → pencairan → `/audit` |
| Contract verified on explorer | Selesai | TANIToken, TaniTraceFunding, dan TANIFaucet berstatus `match` di Sourcify Monad |
| Someone else can run from README | Siap | `contracts/script/setup.sh`, `scripts/deploy-and-update-env.sh`, setup lokal, dan runbook demo |

## Build in public

Item berikut membutuhkan aksi pemilik akun sosial dan tidak dapat dilakukan
dari repository saja:

- posting progress di X atau LinkedIn dengan tag `@monad`, `@monad_dev`, dan
  akun penyelenggara yang relevan;
- upload demo video minimal 30 detik yang memperlihatkan produk berjalan dan
  satu transaksi nyata;
- upload creative ad video terpisah.

Gunakan URL production dan repo publik yang sama di setiap posting. Jangan
pernah menampilkan private key, seed phrase, atau secret API.

## Bonus

| Kriteria | Status | Catatan |
| --- | --- | --- |
| Mainnet deployment | Disiapkan, belum dijalankan | `CONFIRM_MAINNET=YES bash scripts/deploy-mainnet.sh`; membutuhkan wallet dan MON Mainnet |
| Custom domain | Selesai | `www.tanitrace.web.id` |
| Product-market fit | Perlu dibuktikan | Pitch masalah petani, investor, escrow transparan, dan user journey |
| Revenue potential | Perlu dipresentasikan | Jelaskan opsi fee pencairan, SaaS koperasi, atau fee verifikasi—belum diaktifkan di kontrak MVP |
| Innovation/originality | Siap dipresentasikan | On-chain escrow, contribution-weighted voting, IPFS manifest hash, dan advisory AI |

## Pitch proof points

1. “Dana investor tidak berada di wallet admin; kontribusi masuk escrow.”
2. “Pencairan diputuskan investor campaign dan setiap keputusan tercatat on-chain.”
3. “Bukti disimpan di IPFS dan manifest hash diverifikasi ulang oleh frontend.”
4. “Siapa pun dapat membuka feed audit dan memeriksa transaction hash di explorer.”
5. “TNC adalah token simulasi testnet; demo tidak meminta dana nyata.”

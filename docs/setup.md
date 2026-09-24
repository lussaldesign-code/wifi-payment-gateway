# Setup

## 1. Server
Node.js 20+ disarankan.
npm install
cp .env.example .env
npm start

## 2. Tripay
Isi TRIPAY_MODE, TRIPAY_MERCHANT_CODE, TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY.
Atur callback merchant ke:
BASE_URL/api/webhook/tripay

Callback harus melalui HTTPS pada production. Server memvalidasi X-Callback-Signature sebelum memproses pembayaran.

## 3. MikroTik
RouterOS menyediakan REST API pada /rest. Gunakan HTTPS/www-ssl dan akun khusus API dengan hak minimum yang diperlukan. Isi MIKROTIK_URL, MIKROTIK_USERNAME, MIKROTIK_PASSWORD dan set MIKROTIK_ENABLED=true.

Aplikasi saat ini membuat akun HotSpot pada /rest/ip/hotspot/user menggunakan profile paket.

## 4. Production
- Gunakan HTTPS.
- Ganti ADMIN_TOKEN dengan random secret panjang.
- Jangan commit .env.
- Batasi akses RouterOS dari IP server.
- Gunakan backup database.
- Uji callback duplicate/pending/failed sebelum menerima pembayaran nyata.

## 5. Catatan
Aktivasi akun hanya dilakukan dari callback berstatus PAID yang signature-nya valid. Redirect pelanggan bukan bukti pembayaran.

## QRIS di repository
File `Qris.jpg` sekarang ditampilkan langsung pada halaman checkout dan halaman status pembayaran.

**Penting:** QRIS statis dari gambar tidak dapat memberi tahu server secara otomatis bahwa uang sudah masuk. Tombol "Saya sudah bayar" hanya membuat klaim pelanggan; tombol itu tidak mengaktifkan akun. Untuk aktivasi benar-benar otomatis, gunakan Tripay/penyedia QRIS yang mengirim webhook `PAID` ke `/api/webhook/tripay`.

## Urutan pemasangan setelah kode siap
1. Jalankan aplikasi di server/hosting yang memiliki URL HTTPS publik.
2. Isi environment variables dari `.env.example`; jangan masukkan secret ke GitHub.
3. Masukkan kredensial Tripay jika ingin pembayaran QRIS otomatis.
4. Set callback Tripay ke `https://DOMAIN-ANDA/api/webhook/tripay`.
5. Tes pembayaran sandbox terlebih dahulu.
6. Setelah webhook PAID masuk dan transaksi berubah menjadi PAID, baru hubungkan MikroTik dengan `MIKROTIK_ENABLED=true` dan akun API khusus.
7. Tes satu paket kecil: checkout → bayar → webhook PAID → user HotSpot dibuat → kredensial muncul di halaman status.

Jika hanya memakai `Qris.jpg` tanpa provider webhook, proses pembayaran tetap membutuhkan verifikasi manual sebelum akun WiFi boleh diaktifkan.

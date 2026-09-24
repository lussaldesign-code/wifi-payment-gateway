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

# WiFi Payment Gateway

Payment gateway khusus usaha WiFi/RT-RW Net.

Alur: pelanggan -> checkout -> payment gateway -> callback terverifikasi -> aktivasi akun MikroTik.

Stack: Node.js, Express, SQLite, Tripay, MikroTik RouterOS REST API.

## Jalankan
npm install
cp .env.example .env
npm start

Isi credential Tripay dan MikroTik pada .env. Jangan commit secret.


## PHPNuxBill

Plugin tersedia di `phpnuxbill-plugin/`.

Alur integrasi:
`PHPNuxBill -> Diconnect Gateway -> Tripay/QRIS -> webhook -> PHPNuxBill -> Package::rechargeUser()`

Supabase Edge Function untuk membuat pembayaran:
`/functions/v1/phpnuxbill-create-payment`

Secret server yang perlu dikonfigurasi di Supabase:
- `PHPNUXBILL_INTEGRATION_TOKEN`
- `PHPNUXBILL_CALLBACK_SECRET`
- `TRIPAY_MERCHANT_CODE`
- `TRIPAY_API_KEY`
- `TRIPAY_PRIVATE_KEY`
- `TRIPAY_MODE`
- `TRIPAY_CHANNEL`
- `PUBLIC_BASE_URL`
- `PUBLIC_SITE_URL`

Jangan commit atau memasukkan secret tersebut ke JavaScript/browser.

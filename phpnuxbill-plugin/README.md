# Diconnect Gateway PHPNuxBill Plugin

Plugin payment gateway untuk PHPNuxBill yang terhubung ke Diconnect Gateway.

## Alur

1. PHPNuxBill membuat invoice.
2. Plugin mengirim nominal, pelanggan, paket, dan ID invoice ke Diconnect.
3. Diconnect membuat transaksi Tripay/QRIS.
4. Setelah PAID, Diconnect mengirim callback HMAC ke PHPNuxBill.
5. PHPNuxBill memverifikasi callback dan menjalankan Package::rechargeUser().

## Instalasi

Salin `diconnect.php` ke folder plugin PHPNuxBill dan `ui/diconnect.tpl` ke folder UI plugin.

Konfigurasikan melalui menu Payment Gateway:
- Diconnect API URL: `https://pbpqnhhsxhzvviykzhwk.supabase.co/functions/v1`
- Integration Token: token rahasia yang sama dengan secret `PHPNUXBILL_INTEGRATION_TOKEN` di Supabase.
- Callback Secret: token rahasia yang sama dengan secret `PHPNUXBILL_CALLBACK_SECRET` di Supabase.

Jangan memasukkan secret ke JavaScript/browser atau Git.

## Callback

URL callback akan berbentuk:
`https://DOMAIN-PHPNUXBILL/callback/diconnect`

## Catatan

Plugin ini tidak memakai API ViaQris lama. Diconnect menjadi gateway pembayaran dan Tripay menjadi provider QRIS.

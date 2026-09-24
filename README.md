# WiFi Payment Gateway

Payment gateway khusus usaha WiFi/RT-RW Net.

Alur: pelanggan -> checkout -> payment gateway -> callback terverifikasi -> aktivasi akun MikroTik.

Stack: Node.js, Express, SQLite, Tripay, MikroTik RouterOS REST API.

## Jalankan
npm install
cp .env.example .env
npm start

Isi credential Tripay dan MikroTik pada .env. Jangan commit secret.

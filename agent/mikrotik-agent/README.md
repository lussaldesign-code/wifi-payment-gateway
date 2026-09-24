# MikroTik Agent

Program ini dijalankan pada PC/server yang satu jaringan dengan MikroTik. Agent mengambil activation job dari Supabase lalu membuat HotSpot user melalui RouterOS REST API.

## Jalankan
1. Install Node.js 20+.
2. Copy .env.example menjadi .env.
3. Isi AGENT_TOKEN, URL MikroTik, username dan password API.
4. Pastikan RouterOS 7 dan REST API aktif.
5. npm install
6. npm start

Jangan membuka REST API MikroTik ke internet. Agent harus berada di LAN/VPN yang aman.
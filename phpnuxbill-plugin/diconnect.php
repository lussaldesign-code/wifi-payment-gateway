<?php
/**
 * Diconnect Gateway for PHPNuxBill
 * Server-to-server payment creation + status polling + webhook notification.
 */

function diconnect_config_get($key, $default = '')
{
    global $config;
    return isset($config[$key]) ? trim((string)$config[$key]) : $default;
}

function diconnect_validate_config()
{
    if (!diconnect_config_get('diconnect_api_url') || !diconnect_config_get('diconnect_api_token')) {
        r2(U . 'order/package', 'w', Lang::T('Diconnect Gateway belum dikonfigurasi oleh admin.'));
    }
}

function diconnect_show_config()
{
    global $ui;
    $ui->assign('_title', 'Diconnect Gateway - Payment Gateway');
    $ui->display('diconnect.tpl');
}

function diconnect_save_config()
{
    global $admin;
    $keys = ['diconnect_api_url', 'diconnect_api_token', 'diconnect_callback_secret'];
    foreach ($keys as $key) {
        $value = trim((string)_post($key));
        $row = ORM::for_table('tbl_appconfig')->where('setting', $key)->find_one();
        if (!$row) {
            $row = ORM::for_table('tbl_appconfig')->create();
            $row->setting = $key;
        }
        $row->value = $value;
        $row->save();
    }
    _log('[' . $admin['username'] . ']: Diconnect ' . Lang::T('Settings_Saved_Successfully'), 'Admin', $admin['id']);
    r2(U . 'paymentgateway/diconnect', 's', Lang::T('Settings_Saved_Successfully'));
}

function diconnect_http_json($url, $payload, $token)
{
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token
    ];
    $raw = Http::postJsonData($url, $payload, $headers);
    $json = json_decode($raw, true);
    return [$raw, is_array($json) ? $json : null];
}

function diconnect_create_transaction($trx, $user)
{
    diconnect_validate_config();

    $api = rtrim(diconnect_config_get('diconnect_api_url'), '/');
    $token = diconnect_config_get('diconnect_api_token');

    $callbackUrl = rtrim(U, '/') . '/callback/diconnect';
    $payload = [
        'external_reference' => 'PNB-' . $trx['id'],
        'external_system' => 'phpnuxbill',
        'plan_name' => $trx['plan_name'],
        'amount' => (int)$trx['price'],
        'customer' => [
            'name' => $user['fullname'] ?: $user['username'],
            'phone' => $user['phonenumber'] ?? '',
            'email' => $user['email'] ?? '',
        ],
        'callback_url' => $callbackUrl,
        'description' => 'Pembayaran Paket: ' . $trx['plan_name'],
    ];

    [$raw, $result] = diconnect_http_json($api . '/phpnuxbill-create-payment', $payload, $token);

    if (!$result || empty($result['success'])) {
        _log('Diconnect create payment failed: ' . $raw, 'System');
        r2(U . 'order/view/' . $trx['id'], 'e', Lang::T('Gagal membuat pembayaran Diconnect Gateway.'));
    }

    $d = ORM::for_table('tbl_payment_gateway')
        ->where('username', $user['username'])
        ->where('status', 1)
        ->find_one();

    if (!$d) {
        r2(U . 'order/view/' . $trx['id'], 'e', Lang::T('Data transaksi PHPNuxBill tidak ditemukan.'));
    }

    $d->gateway_trx_id = $result['data']['reference'] ?? $result['data']['merchant_ref'];
    $d->pg_url_payment = $result['data']['checkout_url'];
    $d->pg_request = json_encode($result['data']);
    $d->expired_date = $result['data']['expired_at'] ?? date('Y-m-d H:i:s', strtotime('+60 minutes'));
    $d->save();

    r2($result['data']['checkout_url'], 's', Lang::T('Create Transaction Success'));
}

function diconnect_get_status($trx, $user)
{
    diconnect_validate_config();

    $api = rtrim(diconnect_config_get('diconnect_api_url'), '/');
    $token = diconnect_config_get('diconnect_api_token');
    $ref = urlencode($trx['gateway_trx_id']);

    $headers = [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json'
    ];
    $raw = Http::getData($api . '/payment-status?ref=' . $ref, $headers);
    $result = json_decode($raw, true);

    if (!is_array($result) || empty($result['success'])) {
        r2(U . 'order/view/' . $trx['id'], 'w', Lang::T('Gagal mengambil status pembayaran Diconnect.'));
    }

    $data = $result['data'] ?? [];
    if (($data['status'] ?? '') === 'PAID' && $trx['status'] != 2) {
        if (!Package::rechargeUser($user['id'], $trx['routers'], $trx['plan_id'], $trx['gateway'], $data['wifi_username'] ?? $user['username'])) {
            r2(U . 'order/view/' . $trx['id'], 'd', Lang::T('Pembayaran berhasil, tetapi aktivasi paket gagal.'));
        }
        $trx->pg_paid_response = json_encode($data);
        $trx->payment_method = 'Diconnect';
        $trx->payment_channel = 'QRIS';
        $trx->paid_date = date('Y-m-d H:i:s');
        $trx->status = 2;
        $trx->save();
        r2(U . 'order/view/' . $trx['id'], 's', Lang::T('Transaction has been paid.'));
    }

    r2(U . 'order/view/' . $trx['id'], 'w', Lang::T('Transaction is still waiting for payment.'));
}

function diconnect_payment_notification()
{
    $raw = file_get_contents('php://input');
    $signature = $_SERVER['HTTP_X_DICONNECT_SIGNATURE'] ?? '';
    $secret = diconnect_config_get('diconnect_callback_secret');

    if (!$secret || !$raw || !$signature) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $expected = hash_hmac('sha256', $raw, $secret);
    if (!hash_equals($expected, $signature)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid signature']);
        exit;
    }

    $payload = json_decode($raw, true);
    $external = $payload['external_reference'] ?? '';
    if (!$external) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing external_reference']);
        exit;
    }

    $id = (int)preg_replace('/^PNB-/', '', $external);
    $trx = ORM::for_table('tbl_payment_gateway')->where('id', $id)->find_one();

    if (!$trx) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Transaction not found']);
        exit;
    }

    if (($payload['status'] ?? '') === 'PAID' && $trx['status'] != 2) {
        $user = ORM::for_table('tbl_customers')->where('username', $trx['username'])->find_one();
        if (!$user || !Package::rechargeUser($user['id'], $trx['routers'], $trx['plan_id'], $trx['gateway'], $payload['wifi_username'] ?? $user['username'])) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Package activation failed']);
            exit;
        }
        $trx->pg_paid_response = json_encode($payload);
        $trx->payment_method = 'Diconnect';
        $trx->payment_channel = 'QRIS';
        $trx->paid_date = date('Y-m-d H:i:s');
        $trx->status = 2;
        $trx->save();
    }

    http_response_code(200);
    echo json_encode(['success' => true]);
}

function diconnect_get_server()
{
}

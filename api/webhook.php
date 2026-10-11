<?php
require __DIR__ . '/lib.php';

$payload = file_get_contents('php://input');
$sig     = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

if (!stripe_verify_webhook($payload, $sig, cfg()['stripe_webhook_secret'])) {
    app_log('WEBHOOK signature invalide (le whsec_ de config.php ne correspond pas à ce endpoint ?)');
    http_response_code(400);
    exit('Signature invalide');
}

$event = json_decode($payload, true);
app_log('WEBHOOK reçu : ' . ($event['type'] ?? '?') . ' ' . ($event['data']['object']['id'] ?? ''));
if (($event['type'] ?? '') !== 'checkout.session.completed') {
    json_out(200, ['received' => true]);
}

try {
$session  = $event['data']['object'];
$meta     = $session['metadata'] ?? [];
$email    = $session['customer_details']['email'] ?? ($session['customer_email'] ?? '');
$deposit  = ($session['amount_total'] ?? 0) / 100;

$order = []; $ci = []; $source = 'aucune donnée';
$stored = !empty($meta['order_id']) ? order_load($meta['order_id']) : null;
if ($stored && !empty($stored['orderDetails']['products'])) {
    $order = $stored['orderDetails']; $ci = $stored['customerInfo'] ?? []; $source = 'fichier ' . $meta['order_id'];
} else {
    $compact = unpack_meta('ord', $meta);
    $order = $compact ? expand_order($compact) : [];
    $ci = unpack_meta('cust', $meta) ?: [];
    $source = 'métadonnées Stripe' . ($compact ? '' : ' (ILLISIBLES)');
}
app_log('WEBHOOK détail commande via ' . $source . ' : ' . count($order['products'] ?? []) . ' ligne(s)');

// Valeurs de secours depuis les clés "à plat" si le détail est manquant
if (empty($order['total'])) {
    $order = [
        'products' => [], 'productSummary' => $meta['productSummary'] ?? '',
        'subtotal' => (float)($meta['orderTotal'] ?? 0), 'deliveryFee' => 0,
        'total' => (float)($meta['orderTotal'] ?? 0), 'deposit' => $deposit, 'balance' => (float)($meta['balanceAmount'] ?? 0),
    ];
}
$ci += ['phone' => $meta['phone'] ?? '', 'pickupPoint' => $meta['pickupPoint'] ?? '', 'zone' => $meta['zone'] ?? '', 'deliveryDate' => $meta['deliveryDate'] ?? ''];

$name = trim(($ci['firstName'] ?? '') . ' ' . ($ci['lastName'] ?? '')) ?: ($meta['customerName'] ?? 'Client');
$d = ['customerName' => $name, 'customerEmail' => $email, 'customerInfo' => $ci, 'order' => $order, 'deposit' => $deposit, 'sessionId' => $session['id'], 'source' => $source];

// On répond toujours 200 à Stripe (sinon il renvoie l'événement et les mails partent en double)
if ($email) send_mail($email, "✅ Commande confirmée" . (!empty($ci['deliveryDate']) ? ' pour le ' . fr_date($ci['deliveryDate']) : '') . " - Cinnad'moun", customer_email_html($d));
$subjDate = !empty($ci['deliveryDate']) ? fr_date($ci['deliveryDate']) : 'date non précisée';
send_mail(cfg()['merchant_email'], '🔔 Nouvelle commande pour ' . $subjDate . ' · ' . $name, merchant_email_html($d));

} catch (Throwable $e) {
    app_log('WEBHOOK ERREUR ' . get_class($e) . ' : ' . $e->getMessage() . ' (' . basename($e->getFile()) . ':' . $e->getLine() . ')');
}
json_out(200, ['received' => true]);

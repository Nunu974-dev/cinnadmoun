<?php
require __DIR__ . '/lib.php';
send_cors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(405, ['error' => 'Méthode non autorisée']);

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) json_out(400, ['error' => 'Requête invalide']);

$amount  = (int)($body['amount'] ?? 0);
$cust    = $body['customerInfo'] ?? null;
$order   = $body['orderDetails'] ?? null;
$success = $body['successUrl'] ?? '';
$cancel  = $body['cancelUrl'] ?? '';

if ($amount < 50) json_out(400, ['error' => 'Montant invalide. Minimum 0,50€']);
if (!is_array($cust) || !is_array($order) || empty($cust['email'])) json_out(400, ['error' => 'Données manquantes']);

// Les URLs de retour doivent rester sur notre domaine
foreach ([$success, $cancel] as $u) {
    $host = parse_url($u, PHP_URL_HOST);
    if (!$host || !in_array('https://' . $host, cfg()['allowed_origins'], true)) json_out(400, ['error' => 'URL de retour invalide']);
}

$meta = array_merge(
    pack_meta('cust', $cust),
    pack_meta('ord', compact_order($order)),
    [
        'customerName'  => trim(($cust['firstName'] ?? '') . ' ' . ($cust['lastName'] ?? '')),
        'phone'         => $cust['phone'] ?? '',
        'pickupPoint'   => $cust['pickupPoint'] ?? '',
        'zone'          => $cust['zone'] ?? '',
        'deliveryDate'  => $cust['deliveryDate'] ?? '',
        'orderTotal'    => (string)($order['total'] ?? ''),
        'depositAmount' => (string)($order['deposit'] ?? ''),
        'balanceAmount' => (string)($order['balance'] ?? ''),
        'productSummary'=> mb_substr((string)($order['productSummary'] ?? ''), 0, 450),
    ]
);
// Copie complète de la commande sur le serveur (le webhook la relit via order_id)
$orderId = order_save(['customerInfo' => $cust, 'orderDetails' => $order, 'created' => date('c')]);
if ($orderId) $meta['order_id'] = $orderId; else app_log('order_save impossible (droits d\'écriture sur api/orders ?)');

if (count($meta) > 45) json_out(400, ['error' => 'Commande trop volumineuse', 'details' => 'Réduisez le message ou le nombre de lignes.']);

try {
    $session = stripe_request('POST', '/checkout/sessions', [
        'mode'                 => 'payment',
        'payment_method_types' => ['card'],
        'customer_email'       => $cust['email'],
        'line_items'           => [[
            'quantity'   => 1,
            'price_data' => [
                'currency'     => 'eur',
                'unit_amount'  => $amount,
                'product_data' => [
                    'name'        => "Commande Cinnad'moun - Acompte",
                    'description' => mb_substr((string)($order['productSummary'] ?? "Cinnamon rolls artisanaux"), 0, 400),
                    'images'      => ['https://cinnadmoun.re/img/Logo.png'],
                ],
            ],
        ]],
        'metadata'    => $meta,
        'success_url' => $success,
        'cancel_url'  => $cancel,
    ]);
    json_out(200, ['sessionId' => $session['id'], 'url' => $session['url']]);
} catch (Throwable $e) {
    error_log('create-checkout-session : ' . $e->getMessage());
    json_out(500, ['error' => 'Erreur lors de la création de la session de paiement', 'details' => $e->getMessage()]);
}

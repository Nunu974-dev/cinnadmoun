<?php
// Fonctions communes : Stripe, Resend, métadonnées et templates email Cinnad'moun

function cfg(): array {
    static $c = null;
    if ($c === null) {
        $f = __DIR__ . '/config.php';
        if (!is_file($f)) { http_response_code(500); error_log('api/config.php manquant'); exit('Configuration manquante'); }
        $c = require $f;
    }
    return $c;
}

function esc($v): string { return htmlspecialchars((string)($v ?? ''), ENT_QUOTES, 'UTF-8'); }
function eur($n): string { return number_format((float)$n, 2, ',', ' ') . '€'; }

function json_out(int $code, array $data): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function send_cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin && in_array($origin, cfg()['allowed_origins'], true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
}

// ---------- Stripe (API REST directe, sans SDK) ----------
function stripe_request(string $method, string $path, array $params = []): array {
    $ch = curl_init('https://api.stripe.com/v1' . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_USERPWD        => cfg()['stripe_secret_key'] . ':',
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_POSTFIELDS     => $method === 'GET' ? null : http_build_query($params),
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) throw new RuntimeException("Stripe injoignable : $err");
    $data = json_decode($raw, true);
    if (isset($data['error'])) {
        $e = new RuntimeException($data['error']['message'] ?? 'Erreur Stripe');
        throw $e;
    }
    return $data;
}

function stripe_verify_webhook(string $payload, string $header, string $secret, int $tolerance = 300): bool {
    $t = null; $sigs = [];
    foreach (explode(',', $header) as $part) {
        $kv = explode('=', trim($part), 2);
        if (count($kv) !== 2) continue;
        if ($kv[0] === 't') $t = $kv[1];
        if ($kv[0] === 'v1') $sigs[] = $kv[1];
    }
    if (!$t || !$sigs || abs(time() - (int)$t) > $tolerance) return false;
    $expected = hash_hmac('sha256', "$t.$payload", $secret);
    foreach ($sigs as $s) if (hash_equals($expected, $s)) return true;
    return false;
}

// ---------- Resend ----------
function send_mail(string $to, string $subject, string $html): bool {
    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . cfg()['resend_api_key'], 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode(['from' => cfg()['from'], 'to' => [$to], 'subject' => $subject, 'html' => $html], JSON_UNESCAPED_UNICODE),
    ]);
    $res  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300) { error_log("Resend $code : $res"); return false; }
    return true;
}

// ---------- Métadonnées Stripe (500 caractères max par clé) ----------
function pack_meta(string $prefix, array $obj): array {
    $json = json_encode($obj, JSON_UNESCAPED_UNICODE);
    $out = [];
    foreach (mb_str_split($json, 450) as $i => $chunk) $out["{$prefix}_{$i}"] = $chunk;
    return $out;
}

function unpack_meta(string $prefix, array $meta): ?array {
    $json = '';
    for ($i = 0; isset($meta["{$prefix}_{$i}"]); $i++) $json .= $meta["{$prefix}_{$i}"];
    return $json === '' ? null : json_decode($json, true);
}

function compact_order(array $o): array {
    $p = [];
    foreach (($o['products'] ?? []) as $x) {
        $p[] = [$x['name'] ?? '', $x['option'] ?? '', (int)($x['quantity'] ?? 0), (float)($x['unitPrice'] ?? 0), (float)($x['total'] ?? 0), $x['composition'] ?? ''];
    }
    return ['p' => $p, 's' => $o['subtotal'] ?? 0, 'd' => $o['deliveryFee'] ?? 0, 't' => $o['total'] ?? 0, 'a' => $o['deposit'] ?? 0, 'b' => $o['balance'] ?? 0];
}

function expand_order(array $c): array {
    $products = [];
    foreach (($c['p'] ?? []) as $x) {
        $products[] = ['name' => $x[0], 'option' => $x[1], 'quantity' => $x[2], 'unitPrice' => $x[3], 'total' => $x[4], 'composition' => $x[5]];
    }
    return ['products' => $products, 'subtotal' => $c['s'] ?? 0, 'deliveryFee' => $c['d'] ?? 0, 'total' => $c['t'] ?? 0, 'deposit' => $c['a'] ?? 0, 'balance' => $c['b'] ?? 0];
}

// ---------- Templates email ----------
function item_html(array $item): string {
    $label    = trim(preg_replace('/\s*-\s*[\d.,]+\s*€\s*$/u', '', (string)$item['option']));
    $isDisc   = !empty($item['composition']);
    $isBox    = $isDisc || stripos($label, 'box') !== false;
    $qty      = (int)$item['quantity'];
    $badge    = $isBox
        ? '<span style="background:#8B4513;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;">📦 BOX</span>'
        : '<span style="background:#D4A574;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;">🥐 À L\'UNITÉ</span>';

    if ($isDisc) {
        $lis = '';
        foreach (array_values(array_filter(array_map('trim', explode('|', $item['composition'])))) as $i => $boxComp) {
            $lis .= '<li style="margin:3px 0;"><strong>Box ' . ($i + 1) . ' :</strong> ' . esc($boxComp) . '</li>';
        }
        $detail = '<p style="margin:8px 0 2px;font-size:13px;color:#5D4037;"><strong>Composition (' . $qty . ' box × 4 rolls) :</strong></p><ul style="margin:0;padding-left:20px;font-size:13px;color:#5D4037;">' . $lis . '</ul>';
    } elseif ($isBox) {
        $detail = '<p style="margin:8px 0 0;font-size:13px;color:#5D4037;">' . $qty . ' box de 4 rolls <strong>' . esc($item['name']) . '</strong> (' . ($qty * 4) . ' rolls au total)</p>';
    } else {
        $detail = '<p style="margin:8px 0 0;font-size:13px;color:#5D4037;">' . $qty . ' roll' . ($qty > 1 ? 's' : '') . ' <strong>' . esc($item['name']) . '</strong></p>';
    }

    return '<div style="background:#FAFAFA;padding:14px 16px;margin:10px 0;border-radius:8px;border:1px solid #E0E0E0;">'
        . '<table style="width:100%;border-collapse:collapse;"><tr>'
        . '<td style="font-size:16px;font-weight:bold;color:#8B4513;">' . esc($item['name']) . ' ' . $badge . '</td>'
        . '<td style="text-align:right;font-size:16px;font-weight:bold;color:#8B4513;white-space:nowrap;">' . eur($item['total']) . '</td>'
        . '</tr></table>'
        . '<p style="margin:4px 0 0;font-size:12px;color:#999;">' . esc($label) . ' · ' . $qty . ' × ' . eur($item['unitPrice']) . '</p>'
        . $detail . '</div>';
}

function items_html(array $order): string {
    if (!empty($order['products'])) return implode('', array_map('item_html', $order['products']));
    return '<p style="color:#5D4037;">' . esc($order['productSummary'] ?? 'Voir le détail dans Stripe') . '</p>';
}

function balance_of(array $order, float $deposit): float {
    return !empty($order['balance']) ? (float)$order['balance'] : max((float)($order['total'] ?? 0) - $deposit, 0);
}

function recap_html(array $order, float $deposit): string {
    $pct = ($order['total'] ?? 0) > 0 ? round($deposit / $order['total'] * 100) : 0;
    $pctLabel = $pct ? " ($pct%)" : '';
    $delivery = !empty($order['deliveryFee']) ? eur($order['deliveryFee']) : '<span style="color:#4CAF50;">Offerts ✨</span>';
    return '<table style="width:100%;border-collapse:collapse;">'
        . '<tr><td style="padding:6px 0;color:#5D4037;">Sous-total produits</td><td style="padding:6px 0;text-align:right;color:#5D4037;">' . eur($order['subtotal'] ?? 0) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#5D4037;">Frais de livraison</td><td style="padding:6px 0;text-align:right;color:#5D4037;">' . $delivery . '</td></tr>'
        . '<tr style="border-top:2px solid #D4A574;"><td style="padding:12px 0 6px;font-size:17px;font-weight:bold;color:#8B4513;">Total commande</td><td style="padding:12px 0 6px;text-align:right;font-size:19px;font-weight:bold;color:#8B4513;">' . eur($order['total'] ?? 0) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#2E7D32;">✅ Acompte payé' . $pctLabel . '</td><td style="padding:6px 0;text-align:right;color:#2E7D32;font-weight:bold;">' . eur($deposit) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#E65100;font-weight:bold;">💰 Reste à payer au retrait</td><td style="padding:6px 0;text-align:right;color:#E65100;font-weight:bold;">' . eur(balance_of($order, $deposit)) . '</td></tr>'
        . '</table>';
}

function info_row(string $k, $v): string {
    if ($v === '' || $v === null) return '';
    return '<tr><td style="padding:5px 0;color:#5D4037;font-size:14px;"><strong>' . $k . '</strong></td><td style="padding:5px 0;color:#5D4037;font-size:14px;">' . esc($v) . '</td></tr>';
}

function customer_email_html(array $d): string {
    $ci = $d['customerInfo']; $order = $d['order']; $deposit = $d['deposit'];
    $msg = !empty($ci['message']) ? '<div style="background:#E8F5E9;padding:14px;border-radius:8px;border-left:4px solid #4CAF50;margin-bottom:22px;"><strong style="color:#2E7D32;font-size:14px;">💬 Votre message</strong><p style="margin:6px 0 0;color:#5D4037;font-size:14px;">' . esc($ci['message']) . '</p></div>' : '';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
    . '<body style="margin:0;padding:0;background:#f9f6f1;font-family:Georgia,serif;"><div style="max-width:600px;margin:0 auto;background:#fff;">'
    . '<div style="background:linear-gradient(135deg,#8B4513 0%,#A0522D 100%);padding:36px 20px;text-align:center;">'
    . '<img src="https://cinnadmoun.re/img/Logo.png" alt="Cinnad\'moun" style="max-width:130px;height:auto;margin-bottom:12px;">'
    . '<h1 style="color:#fff;margin:0;font-size:26px;font-weight:300;letter-spacing:2px;">Merci pour votre commande !</h1></div>'
    . '<div style="padding:32px 28px;">'
    . '<p style="font-size:16px;color:#5D4037;">Bonjour <strong>' . esc($d['customerName']) . '</strong>,</p>'
    . '<p style="font-size:15px;color:#5D4037;line-height:1.6;">Votre acompte de <strong>' . eur($deposit) . '</strong> a bien été reçu : votre commande est confirmée. 🎉</p>'
    . '<h3 style="color:#8B4513;border-bottom:2px solid #D4A574;padding-bottom:8px;">🥐 Votre commande</h3>' . items_html($order)
    . '<div style="background:#F5F5F5;padding:18px;border-radius:8px;margin:22px 0;">' . recap_html($order, $deposit) . '</div>'
    . '<div style="background:#FFF8E1;border-left:4px solid #D4A574;padding:16px;border-radius:4px;margin-bottom:22px;"><h3 style="color:#8B4513;margin:0 0 10px;font-size:16px;">📍 Retrait</h3><table style="width:100%;border-collapse:collapse;">'
    . info_row('Point de retrait', $ci['pickupPoint'] ?? '') . info_row('Date souhaitée', $ci['deliveryDate'] ?? '') . info_row('Téléphone', $ci['phone'] ?? '') . info_row('Email', $d['customerEmail'])
    . '</table></div>' . $msg
    . '<div style="background:#E3F2FD;padding:18px;border-radius:8px;"><h3 style="color:#1565C0;margin:0 0 10px;font-size:16px;">📋 Prochaines étapes</h3>'
    . '<ul style="margin:0;padding-left:20px;color:#5D4037;font-size:14px;line-height:1.8;">'
    . '<li>Nous vous contactons par SMS/email pour confirmer la date et l\'heure de retrait</li>'
    . '<li>Réglez le solde de <strong>' . eur(balance_of($order, $deposit)) . '</strong> au retrait</li>'
    . '<li>Conservez cet email comme preuve de commande</li></ul></div></div>'
    . '<div style="background:#3E2723;padding:26px 20px;text-align:center;"><p style="color:#D4A574;font-size:17px;margin:0 0 8px;font-weight:bold;">L\'équipe Cinnad\'moun</p>'
    . '<p style="color:#BCAAA4;font-size:12px;margin:4px 0;">📧 <a href="mailto:contact@cinnadmoun.re" style="color:#D4A574;text-decoration:none;">contact@cinnadmoun.re</a></p>'
    . '<p style="color:#BCAAA4;font-size:12px;margin:4px 0;">📱 +262 692 37 72 43</p></div></div></body></html>';
}

function merchant_email_html(array $d): string {
    $ci = $d['customerInfo']; $order = $d['order']; $deposit = $d['deposit'];
    $row = fn($k, $v) => '<tr><td style="padding:5px 0;font-weight:bold;color:#333;">' . $k . '</td><td style="padding:5px 0;color:#333;">' . $v . '</td></tr>';
    $msg = !empty($ci['message']) ? '<div style="background:#E8F5E9;padding:14px;border-radius:6px;margin-top:18px;"><strong>💬 Message du client</strong><br>' . esc($ci['message']) . '</div>' : '';
    $when = (new DateTime('now', new DateTimeZone('Indian/Reunion')))->format('d/m/Y H:i');
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><div style="max-width:620px;margin:0 auto;background:#fff;">'
    . '<div style="background:#2E7D32;padding:22px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:22px;">🎉 Nouvelle commande</h1><p style="color:#E8F5E9;margin:6px 0 0;font-size:13px;">' . $when . '</p></div>'
    . '<div style="padding:24px;">'
    . '<div style="background:#FFF3E0;border:2px solid #E65100;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;"><div style="font-size:13px;color:#666;">Total ' . eur($order['total'] ?? 0) . ' · déjà payé ' . eur($deposit) . '</div>'
    . '<div style="font-size:22px;font-weight:bold;color:#E65100;">💰 À encaisser : ' . eur(balance_of($order, $deposit)) . '</div></div>'
    . '<h3 style="color:#2E7D32;margin:0 0 8px;">🥐 À préparer</h3>' . items_html($order)
    . '<h3 style="color:#2E7D32;margin:22px 0 8px;">👤 Client</h3><table style="width:100%;border-collapse:collapse;font-size:14px;">'
    . $row('Nom', esc($d['customerName']))
    . $row('Email', '<a href="mailto:' . esc($d['customerEmail']) . '">' . esc($d['customerEmail']) . '</a>')
    . $row('Téléphone', '<a href="tel:' . esc($ci['phone'] ?? '') . '">' . esc($ci['phone'] ?? 'N/A') . '</a>')
    . $row('Point de retrait', esc($ci['pickupPoint'] ?? 'N/A'))
    . (!empty($ci['zone']) ? $row('Zone', esc(strtoupper($ci['zone']))) : '')
    . $row('Date souhaitée', esc($ci['deliveryDate'] ?: 'Non précisée'))
    . '</table>' . $msg
    . '<div style="background:#F5F5F5;padding:16px;border-radius:8px;margin-top:22px;">' . recap_html($order, $deposit) . '</div>'
    . '<p style="font-size:11px;color:#999;margin-top:18px;">Session Stripe : ' . esc($d['sessionId']) . '</p></div></div></body></html>';
}

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

// Journal des envois (api/logs/, inaccessible depuis le web)
function app_log(string $msg): void {
    $dir = __DIR__ . '/logs';
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); @file_put_contents($dir . '/.htaccess', "Require all denied\n"); }
    @file_put_contents($dir . '/app.log', '[' . date('Y-m-d H:i:s') . '] ' . $msg . "\n", FILE_APPEND | LOCK_EX);
    error_log($msg);
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
        CURLOPT_USERAGENT      => 'cinnadmoun-site/1.0',
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . cfg()['resend_api_key'], 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode(['from' => cfg()['from'], 'to' => [$to], 'subject' => $subject, 'html' => $html], JSON_UNESCAPED_UNICODE),
    ]);
    $res  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($res === false || $code < 200 || $code >= 300) {
        app_log("MAIL ECHEC vers $to (HTTP $code) : " . ($res === false ? "cURL: $err" : $res));
        return false;
    }
    app_log("MAIL OK vers $to : $res");
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

// ---------- Stockage des commandes (relecture exacte de ce que le site a envoyé) ----------
function order_dir(): string {
    $d = __DIR__ . '/orders';
    if (!is_dir($d)) { @mkdir($d, 0755, true); @file_put_contents($d . '/.htaccess', "Require all denied\n"); }
    return $d;
}

function order_save(array $data): ?string {
    $id = bin2hex(random_bytes(8));
    $ok = @file_put_contents(order_dir() . "/$id.json", json_encode($data, JSON_UNESCAPED_UNICODE));
    return $ok === false ? null : $id;
}

function order_load(string $id): ?array {
    if (!preg_match('/^[a-f0-9]{16}$/', $id)) return null;
    $f = order_dir() . "/$id.json";
    if (!is_file($f)) return null;
    $d = json_decode((string)file_get_contents($f), true);
    return is_array($d) ? $d : null;
}

// ---------- Dates en français ----------
function fr_date(?string $iso, bool $withYear = true): string {
    if (!$iso || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $iso)) return (string)$iso;
    $days   = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    $months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    $d = new DateTime($iso);
    return $days[(int)$d->format('w')] . ' ' . (int)$d->format('j') . ' ' . $months[(int)$d->format('n') - 1] . ($withYear ? ' ' . $d->format('Y') : '');
}

// ---------- Détail des produits ----------
// "Nature x2, Bueno x2 | Chocolat x4" -> [ ['Nature'=>2,'Bueno'=>2], ['Chocolat'=>4] ]
function parse_boxes(string $comp): array {
    $boxes = [];
    foreach (explode('|', $comp) as $part) {
        $b = [];
        foreach (explode(',', $part) as $f) {
            if (preg_match('/^\s*(.+?)\s*x\s*(\d+)\s*$/u', $f, $m)) $b[$m[1]] = (int)$m[2];
        }
        if ($b) $boxes[] = $b;
    }
    return $boxes;
}

function flavor_of(string $productName): string {
    $map = ['le classique' => 'Nature', 'classique' => 'Nature', 'pomme' => 'Pomme Cannelle', 'cacahuète' => 'Cacahuète', 'chocolat' => 'Chocolat', 'bueno' => 'Bueno'];
    return $map[mb_strtolower(trim($productName))] ?? trim($productName);
}

function item_kind(array $item): string {
    $opt = mb_strtolower((string)($item['option'] ?? ''));
    $name = mb_strtolower((string)($item['name'] ?? ''));
    if (!empty($item['composition']) || strpos($name, 'découverte') !== false) return 'discovery';
    if (strpos($name, 'tiramisu') !== false) return 'tiramisu';
    if (strpos($opt, 'box') !== false) return 'box4';
    return 'piece';
}

function item_label(array $item): string {
    return trim(preg_replace('/\s*-\s*[\d.,]+\s*€\s*$/u', '', (string)($item['option'] ?? '')));
}

// Total à préparer par saveur : [ 'rolls' => ['Nature'=>6,...], 'tiramisu' => ['Tiramisu Oreo'=>1] ]
function production_tally(array $order): array {
    $rolls = []; $other = [];
    foreach (($order['products'] ?? []) as $it) {
        $q = (int)($it['quantity'] ?? 0);
        switch (item_kind($it)) {
            case 'piece': $f = flavor_of($it['name']); $rolls[$f] = ($rolls[$f] ?? 0) + $q; break;
            case 'box4':  $f = flavor_of($it['name']); $rolls[$f] = ($rolls[$f] ?? 0) + 4 * $q; break;
            case 'discovery':
                foreach (parse_boxes((string)($it['composition'] ?? '')) as $b) foreach ($b as $f => $n) $rolls[$f] = ($rolls[$f] ?? 0) + $n;
                break;
            default: $other[$it['name']] = ($other[$it['name']] ?? 0) + $q;
        }
    }
    return ['rolls' => $rolls, 'other' => $other];
}

function flavor_lines_html(array $b, string $color = '#2C2C2C'): string {
    $out = '';
    foreach ($b as $f => $n) $out .= '<div style="font-size:15px;color:' . $color . ';padding:2px 0;"><strong>' . (int)$n . ' ×</strong> ' . esc($f) . '</div>';
    return $out;
}

function item_html(array $item): string {
    $kind = item_kind($item); $qty = (int)$item['quantity']; $label = item_label($item);
    $badge = fn($t, $bg) => '<span style="background:' . $bg . ';color:#fff;font-size:11px;font-weight:bold;padding:3px 9px;border-radius:10px;letter-spacing:.5px;">' . $t . '</span>';
    $body = '';

    if ($kind === 'discovery') {
        $badges = $badge('📦 BOX DÉCOUVERTE', '#8B4513');
        $boxes = parse_boxes((string)($item['composition'] ?? ''));
        if (!$boxes) $body = '<p style="margin:8px 0 0;font-size:13px;color:#8A3B00;">Composition non renseignée</p>';
        foreach ($boxes as $i => $b) {
            $body .= '<div style="margin:10px 0 0;padding:10px 14px;background:#FFF3E0;border-left:4px solid #E65100;border-radius:4px;">'
                  . '<div style="font-size:12px;font-weight:bold;color:#B34700;letter-spacing:.5px;margin-bottom:4px;">BOX N°' . ($i + 1) . ' — 4 ROLLS</div>'
                  . flavor_lines_html($b, '#3E2723') . '</div>';
        }
    } elseif ($kind === 'box4') {
        $badges = $badge('📦 BOX DE 4', '#8B4513');
        $body = '<p style="margin:8px 0 0;font-size:15px;color:#3E2723;">' . $qty . ' box de 4 → <strong>' . ($qty * 4) . ' rolls ' . esc(flavor_of($item['name'])) . '</strong></p>';
    } elseif ($kind === 'tiramisu') {
        $badges = $badge('🍮 TIRAMISU', '#6D4C41');
        $body = '<p style="margin:8px 0 0;font-size:15px;color:#3E2723;">' . $qty . ' barquette' . ($qty > 1 ? 's' : '') . ' de 750g</p>';
    } else {
        $badges = $badge('🥐 À L\'UNITÉ', '#D4A574');
        $body = '<p style="margin:8px 0 0;font-size:15px;color:#3E2723;"><strong>' . $qty . ' ×</strong> ' . esc(flavor_of($item['name'])) . ' (' . $qty . ' roll' . ($qty > 1 ? 's' : '') . ')</p>';
    }

    return '<div style="background:#FFFFFF;padding:14px 16px;margin:10px 0;border-radius:8px;border:1px solid #D7CCC8;">'
        . '<table style="width:100%;border-collapse:collapse;"><tr>'
        . '<td style="font-size:17px;font-weight:bold;color:#3E2723;">' . esc($item['name']) . '<br><span style="line-height:2;">' . $badges . '</span></td>'
        . '<td style="text-align:right;vertical-align:top;font-size:16px;font-weight:bold;color:#3E2723;white-space:nowrap;">' . eur($item['total']) . '</td>'
        . '</tr></table>'
        . '<div style="font-size:12px;color:#6D4C41;margin-top:2px;">' . esc($label) . ' · ' . $qty . ' × ' . eur($item['unitPrice']) . '</div>'
        . $body . '</div>';
}

function items_html(array $order): string {
    if (!empty($order['products'])) return implode('', array_map('item_html', $order['products']));
    return '<p style="color:#3E2723;background:#FFF3E0;padding:12px;border-radius:6px;">⚠️ Détail indisponible : ' . esc($order['productSummary'] ?? 'voir Stripe') . '</p>';
}

function balance_of(array $order, float $deposit): float {
    return !empty($order['balance']) ? (float)$order['balance'] : max((float)($order['total'] ?? 0) - $deposit, 0);
}

function recap_html(array $order, float $deposit): string {
    $pct = ($order['total'] ?? 0) > 0 ? round($deposit / $order['total'] * 100) : 0;
    $pctLabel = $pct ? " ($pct%)" : '';
    $delivery = !empty($order['deliveryFee']) ? eur($order['deliveryFee']) : '<span style="color:#2E7D32;">Offerts ✨</span>';
    return '<table style="width:100%;border-collapse:collapse;color:#3E2723;">'
        . '<tr><td style="padding:6px 0;">Sous-total produits</td><td style="padding:6px 0;text-align:right;">' . eur($order['subtotal'] ?? 0) . '</td></tr>'
        . '<tr><td style="padding:6px 0;">Frais de livraison</td><td style="padding:6px 0;text-align:right;">' . $delivery . '</td></tr>'
        . '<tr style="border-top:2px solid #D4A574;"><td style="padding:12px 0 6px;font-size:17px;font-weight:bold;">Total commande</td><td style="padding:12px 0 6px;text-align:right;font-size:19px;font-weight:bold;">' . eur($order['total'] ?? 0) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#1B5E20;">✅ Acompte payé' . $pctLabel . '</td><td style="padding:6px 0;text-align:right;color:#1B5E20;font-weight:bold;">' . eur($deposit) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#B34700;font-weight:bold;">💵 Reste à payer au retrait</td><td style="padding:6px 0;text-align:right;color:#B34700;font-weight:bold;">' . eur(balance_of($order, $deposit)) . '</td></tr>'
        . '</table>';
}

function info_row(string $k, $v): string {
    if ($v === '' || $v === null) return '';
    return '<tr><td style="padding:5px 12px 5px 0;color:#3E2723;font-size:14px;"><strong>' . $k . '</strong></td><td style="padding:5px 0;color:#3E2723;font-size:14px;">' . esc($v) . '</td></tr>';
}

function customer_email_html(array $d): string {
    $ci = $d['customerInfo']; $order = $d['order']; $deposit = $d['deposit'];
    $when = !empty($ci['deliveryDate']) ? fr_date($ci['deliveryDate']) : '';
    $msg = !empty($ci['message']) ? '<div style="background:#E8F5E9;padding:14px;border-radius:8px;border-left:4px solid #2E7D32;margin-bottom:22px;"><strong style="color:#1B5E20;font-size:14px;">💬 Votre message</strong><p style="margin:6px 0 0;color:#3E2723;font-size:14px;">' . esc($ci['message']) . '</p></div>' : '';
    $dateBlock = $when ? '<div style="background:#3E2723;border-radius:8px;padding:16px;text-align:center;margin-bottom:22px;"><div style="font-size:12px;color:#D4A574;letter-spacing:1px;">VOTRE RETRAIT</div><div style="font-size:21px;font-weight:bold;color:#FFFFFF;margin-top:4px;">📅 ' . esc(ucfirst($when)) . '</div><div style="font-size:14px;color:#EFEBE9;margin-top:4px;">' . esc($ci['pickupPoint'] ?? '') . '</div></div>' : '';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
    . '<body style="margin:0;padding:0;background:#f9f6f1;font-family:Georgia,serif;"><div style="max-width:600px;margin:0 auto;background:#fff;">'
    . '<div style="background:#6B4E2B;padding:34px 20px;text-align:center;">'
    . '<img src="https://cinnadmoun.re/img/Logo.png" alt="Cinnad\'moun" style="max-width:130px;height:auto;margin-bottom:12px;">'
    . '<h1 style="color:#fff;margin:0;font-size:26px;font-weight:300;letter-spacing:2px;">Merci pour votre commande !</h1></div>'
    . '<div style="padding:30px 26px;">'
    . '<p style="font-size:16px;color:#3E2723;">Bonjour <strong>' . esc($d['customerName']) . '</strong>,</p>'
    . '<p style="font-size:15px;color:#3E2723;line-height:1.6;">Votre acompte de <strong>' . eur($deposit) . '</strong> a bien été reçu : votre commande est confirmée. 🎉</p>'
    . $dateBlock
    . '<h3 style="color:#3E2723;border-bottom:2px solid #D4A574;padding-bottom:8px;">🥐 Le détail de votre commande</h3>' . items_html($order)
    . '<div style="background:#F5F1E8;padding:18px;border-radius:8px;margin:22px 0 14px;">' . recap_html($order, $deposit) . '</div>'
    . '<div style="background:#FFF3E0;border:2px solid #E65100;border-radius:8px;padding:16px;margin-bottom:22px;text-align:center;">'
    . '<div style="font-size:14px;color:#3E2723;">Acompte déjà payé en ligne : <strong>' . eur($deposit) . '</strong></div>'
    . '<div style="font-size:20px;font-weight:bold;color:#B34700;margin-top:6px;">💵 Il vous reste ' . eur(balance_of($order, $deposit)) . ' à régler le jour du retrait</div>'
    . '<div style="font-size:13px;color:#3E2723;margin-top:4px;">En espèces, directement lors de la remise de votre commande.</div></div>'
    . '<div style="background:#F5F1E8;border-radius:8px;padding:16px;margin-bottom:22px;"><h3 style="color:#3E2723;margin:0 0 10px;font-size:16px;">📍 Vos informations</h3><table style="width:100%;border-collapse:collapse;">'
    . info_row('Point de retrait', $ci['pickupPoint'] ?? '') . info_row('Téléphone', $ci['phone'] ?? '') . info_row('Email', $d['customerEmail'])
    . '</table></div>' . $msg
    . '<div style="background:#E3F2FD;padding:18px;border-radius:8px;"><h3 style="color:#0D47A1;margin:0 0 10px;font-size:16px;">📋 Prochaines étapes</h3>'
    . '<ul style="margin:0;padding-left:20px;color:#1E2A38;font-size:14px;line-height:1.8;">'
    . '<li>Nous vous contactons par SMS/email pour confirmer l\'heure de retrait</li>'
    . '<li>Réglez le solde de <strong>' . eur(balance_of($order, $deposit)) . '</strong> au retrait</li>'
    . '<li>Conservez cet email comme preuve de commande</li></ul></div></div>'
    . '<div style="background:#3E2723;padding:26px 20px;text-align:center;"><p style="color:#D4A574;font-size:17px;margin:0 0 8px;font-weight:bold;">L\'équipe Cinnad\'moun</p>'
    . '<p style="color:#D7CCC8;font-size:12px;margin:4px 0;">📧 <a href="mailto:contact@cinnadmoun.re" style="color:#D4A574;text-decoration:none;">contact@cinnadmoun.re</a></p>'
    . '<p style="color:#D7CCC8;font-size:12px;margin:4px 0;">📱 +262 692 37 72 43</p></div></div></body></html>';
}

function tally_html(array $order): string {
    $t = production_tally($order);
    if (!$t['rolls'] && !$t['other']) return '';
    $rows = ''; $total = 0;
    foreach ($t['rolls'] as $f => $n) { $total += $n; $rows .= '<tr><td style="padding:5px 0;font-size:15px;color:#3E2723;">' . esc($f) . '</td><td style="padding:5px 0;text-align:right;font-size:17px;font-weight:bold;color:#3E2723;">' . (int)$n . '</td></tr>'; }
    foreach ($t['other'] as $f => $n) $rows .= '<tr><td style="padding:5px 0;font-size:15px;color:#3E2723;">' . esc($f) . '</td><td style="padding:5px 0;text-align:right;font-size:17px;font-weight:bold;color:#3E2723;">' . (int)$n . '</td></tr>';
    return '<div style="background:#F5F1E8;border-radius:8px;padding:16px;margin-top:22px;"><h3 style="color:#3E2723;margin:0 0 8px;">🧮 Total à produire' . ($total ? ' · ' . $total . ' rolls' : '') . '</h3><table style="width:100%;border-collapse:collapse;">' . $rows . '</table></div>';
}

function merchant_email_html(array $d): string {
    $ci = $d['customerInfo']; $order = $d['order']; $deposit = $d['deposit'];
    $row = fn($k, $v) => '<tr><td style="padding:5px 12px 5px 0;font-weight:bold;color:#3E2723;">' . $k . '</td><td style="padding:5px 0;color:#3E2723;">' . $v . '</td></tr>';
    $msg = !empty($ci['message']) ? '<div style="background:#E8F5E9;padding:14px;border-radius:6px;margin-top:18px;color:#1B5E20;"><strong>💬 Message du client</strong><br><span style="color:#3E2723;">' . esc($ci['message']) . '</span></div>' : '';
    $dateTxt = !empty($ci['deliveryDate']) ? mb_strtoupper(fr_date($ci['deliveryDate'])) : 'DATE NON PRÉCISÉE';
    $when = (new DateTime('now', new DateTimeZone('Indian/Reunion')))->format('d/m/Y H:i');
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><div style="max-width:620px;margin:0 auto;background:#fff;">'
    . '<div style="background:#3E2723;padding:22px;text-align:center;">'
    . '<div style="font-size:12px;color:#D4A574;letter-spacing:1.5px;">NOUVELLE COMMANDE POUR LE</div>'
    . '<div style="font-size:26px;font-weight:bold;color:#FFFFFF;margin-top:6px;">📅 ' . esc($dateTxt) . '</div>'
    . '<div style="font-size:15px;color:#EFEBE9;margin-top:8px;">📍 ' . esc($ci['pickupPoint'] ?? 'N/A') . '</div>'
    . '<div style="font-size:11px;color:#BCAAA4;margin-top:8px;">Commande reçue le ' . $when . '</div></div>'
    . '<div style="padding:24px;">'
    . '<div style="background:#FFF3E0;border:2px solid #E65100;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;"><div style="font-size:13px;color:#3E2723;">Total ' . eur($order['total'] ?? 0) . ' · déjà payé ' . eur($deposit) . '</div>'
    . '<div style="font-size:22px;font-weight:bold;color:#B34700;">💰 À encaisser : ' . eur(balance_of($order, $deposit)) . '</div></div>'
    . '<h3 style="color:#3E2723;margin:0 0 8px;border-bottom:2px solid #D4A574;padding-bottom:6px;">🥐 À préparer</h3>' . items_html($order) . tally_html($order)
    . '<h3 style="color:#3E2723;margin:24px 0 8px;border-bottom:2px solid #D4A574;padding-bottom:6px;">👤 Client</h3><table style="width:100%;border-collapse:collapse;font-size:14px;">'
    . $row('Nom', esc($d['customerName']))
    . $row('Téléphone', '<a href="tel:' . esc($ci['phone'] ?? '') . '" style="color:#0D47A1;">' . esc($ci['phone'] ?? 'N/A') . '</a>')
    . $row('Email', '<a href="mailto:' . esc($d['customerEmail']) . '" style="color:#0D47A1;">' . esc($d['customerEmail']) . '</a>')
    . $row('Point de retrait', esc($ci['pickupPoint'] ?? 'N/A'))
    . (!empty($ci['zone']) ? $row('Zone', esc(strtoupper($ci['zone']))) : '')
    . '</table>' . $msg
    . '<div style="background:#F5F1E8;padding:16px;border-radius:8px;margin-top:22px;">' . recap_html($order, $deposit) . '</div>'
    . '<p style="font-size:11px;color:#6D4C41;margin-top:18px;">Session Stripe : ' . esc($d['sessionId']) . (!empty($d['source']) ? ' · détail : ' . esc($d['source']) : '') . '</p></div></div></body></html>';
}

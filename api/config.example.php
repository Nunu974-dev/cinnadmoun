<?php
// Copier ce fichier en api/config.php SUR LE SERVEUR (jamais dans git) et remplir les valeurs.
return [
    'stripe_secret_key'     => 'sk_live_...',
    'stripe_webhook_secret' => 'whsec_...',
    'resend_api_key'        => 're_...',
    'allowed_origins'       => ['https://cinnadmoun.re', 'https://www.cinnadmoun.re'],
    'merchant_email'        => 'commandes@cinnadmoun.re',
    'from'                  => "Cinnad'moun <commandes@cinnadmoun.re>",
];

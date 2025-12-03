# 🎯 Guide d'Intégration Stripe pour Cinnad'moun

## ✅ Ce qui est déjà fait

1. **Configuration de base**
   - Fichier `config.js` créé avec votre clé publique
   - Script Stripe.js chargé
   - Calcul automatique de l'acompte de 30%
   - Interface de paiement complète

2. **Système de commande**
   - Calcul automatique des totaux
   - Frais de livraison par zone (Sud gratuit, Ouest +3€, Nord/Est +5€)
   - Minimum de commande à 25€
   - Récapitulatif en temps réel

## ⚠️ IMPORTANT - Sécurité

**Votre clé secrète a été exposée publiquement !**

### Actions IMMÉDIATES requises :

1. **Allez sur votre Stripe Dashboard** : https://dashboard.stripe.com
2. **Développeurs** → **Clés API**
3. Trouvez votre clé secrète `sk_live_51SZaY8...`
4. Cliquez sur **"..."** → **"Roll"** (Renouveler)
5. **IMPORTANT** : Ne JAMAIS partager votre nouvelle clé secrète

Le fichier `config.js` a été ajouté au `.gitignore` pour éviter qu'il soit publié.

---

## 🔧 Pour activer les paiements Stripe

### Option 1 : Backend Simple (Recommandé pour démarrer)

Vous avez besoin d'un **serveur backend** pour créer des sessions de paiement sécurisées. Voici les options :

#### A. Serveur Node.js (Le plus simple)

1. **Créer un dossier `backend/` :**

```bash
mkdir backend
cd backend
npm init -y
npm install express stripe dotenv cors
```

2. **Créer `backend/server.js` :**

```javascript
require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { amount, orderData } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: "Acompte Cinnad'moun (30%)",
              description: `Commande de ${orderData.firstName} ${orderData.lastName}`,
            },
            unit_amount: amount, // Montant en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/index.html`,
      metadata: {
        orderData: JSON.stringify(orderData)
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur sur port ${PORT}`));
```

3. **Créer `backend/.env` :**

```env
STRIPE_SECRET_KEY=sk_live_VOTRE_NOUVELLE_CLE_SECRETE
FRONTEND_URL=http://localhost:8000
PORT=3000
```

4. **Démarrer le serveur :**

```bash
node server.js
```

5. **Modifier `script.js` pour appeler le backend :**

Remplacez le code dans la fonction du bouton Stripe par :

```javascript
document.getElementById('stripePaymentBtn').addEventListener('click', async function() {
    const form = document.getElementById('orderForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = collectFormData();
    if (!formData.isValid) {
        alert(formData.error);
        return;
    }
    
    const depositAmount = Math.round(formData.deposit * 100);
    
    try {
        // Appel au backend
        const response = await fetch('http://localhost:3000/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: depositAmount,
                orderData: formData
            })
        });
        
        const { url } = await response.json();
        
        // Redirection vers Stripe Checkout
        window.location.href = url;
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du paiement. Veuillez réessayer.');
    }
});
```

#### B. Backend PHP (Si vous avez déjà un hébergement PHP)

1. **Installer Stripe PHP :**

```bash
composer require stripe/stripe-php
```

2. **Créer `backend/create-checkout.php` :**

```php
<?php
require 'vendor/autoload.php';

\Stripe\Stripe::setApiKey('sk_live_VOTRE_NOUVELLE_CLE');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$input = json_decode(file_get_contents('php://input'), true);

try {
    $session = \Stripe\Checkout\Session::create([
        'payment_method_types' => ['card'],
        'line_items' => [[
            'price_data' => [
                'currency' => 'eur',
                'product_data' => [
                    'name' => "Acompte Cinnad'moun (30%)",
                ],
                'unit_amount' => $input['amount'],
            ],
            'quantity' => 1,
        ]],
        'mode' => 'payment',
        'success_url' => 'https://votre-site.com/success.html',
        'cancel_url' => 'https://votre-site.com/index.html',
    ]);

    echo json_encode(['url' => $session->url]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
```

---

### Option 2 : Services No-Code (Plus simple mais avec frais)

Si vous ne voulez pas gérer un serveur :

1. **Zapier + Stripe** : Créez un workflow qui reçoit les données et crée une session Stripe
2. **Make.com (Integromat)** : Similaire à Zapier
3. **Bubble.io** : Plateforme no-code avec intégration Stripe native

---

## 📄 Pages à créer

### 1. Page de succès (`success.html`)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Paiement Réussi - Cinnad'moun</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="success-container">
        <h1>✅ Paiement Réussi !</h1>
        <p>Merci pour votre commande. Nous vous contacterons sous 24h.</p>
        <p>Un email de confirmation vous a été envoyé.</p>
        <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
    </div>
</body>
</html>
```

---

## 🚀 Mise en production

1. **Hébergement du site web :**
   - GitHub Pages (gratuit, pour sites statiques)
   - Netlify (gratuit, avec formulaires)
   - Vercel (gratuit)
   - OVH, O2Switch (payant, avec PHP)

2. **Hébergement du backend :**
   - Heroku (gratuit pour petits projets)
   - Railway (gratuit pour démarrer)
   - DigitalOcean (5$/mois)
   - Votre hébergement web actuel (si PHP)

3. **Configuration DNS :**
   - Pointez votre domaine vers l'hébergement
   - Configurez un certificat SSL (Let's Encrypt gratuit)

---

## 📞 Support

Pour toute question sur l'intégration Stripe :
- Documentation officielle : https://stripe.com/docs
- Support Stripe : https://support.stripe.com

**N'oubliez pas de passer en mode TEST avant de tester les paiements !**
Utilisez les clés de test (pk_test_... et sk_test_...) pour éviter de vraies transactions.

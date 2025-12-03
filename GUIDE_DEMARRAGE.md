# 🚀 Guide de Démarrage - Cinnad'moun

## ✅ Backend opérationnel !

Votre système de paiement Stripe est maintenant **100% fonctionnel** !

---

## 📋 Comment lancer le site

### 1️⃣ Démarrer le backend (serveur de paiement)

**Terminal 1 - Backend :**
```bash
cd "/Users/julienchanewai/Desktop/Cinnad'moun /Cinnad'moun site/backend"
npm start
```

Vous devriez voir :
```
🚀 ═══════════════════════════════════════
🥐 Backend Cinnad'moun démarré
📡 Serveur: http://localhost:3000
💳 Stripe: Configuré ✅
🚀 ═══════════════════════════════════════
```

### 2️⃣ Ouvrir le site web

**Option A - Avec un serveur local Python :**
```bash
cd "/Users/julienchanewai/Desktop/Cinnad'moun /Cinnad'moun site"
python3 -m http.server 8080
```
Puis ouvrir : http://localhost:8080

**Option B - Avec VS Code Live Server :**
- Clic droit sur `index.html`
- "Open with Live Server"

**Option C - Double-clic sur index.html**
(peut ne pas fonctionner à cause de CORS)

---

## 🧪 Tester le paiement

### Mode TEST (recommandé pour commencer)

1. **Passer Stripe en mode TEST** :
   - Aller sur https://dashboard.stripe.com
   - Basculer vers "Mode Test" (en haut à droite)
   - Développeurs → Clés API
   - Copier `pk_test_...` et `sk_test_...`

2. **Remplacer les clés** :
   - Dans `config.js` → mettre `pk_test_...`
   - Dans `backend/.env` → mettre `sk_test_...`

3. **Relancer le backend** :
   ```bash
   # Ctrl+C pour arrêter
   npm start
   ```

4. **Tester avec une carte test** :
   - Numéro : `4242 4242 4242 4242`
   - Date : n'importe quelle date future (ex: 12/25)
   - CVC : n'importe quels 3 chiffres (ex: 123)
   - Code postal : n'importe (ex: 97400)

---

## 💳 Passer en mode LIVE (production)

Une fois les tests validés :

1. Dans Stripe Dashboard → Basculer en "Mode Live"
2. Les clés dans `config.js` et `backend/.env` sont déjà en LIVE
3. Relancer le backend
4. C'est prêt ! Les vrais paiements fonctionnent 🎉

---

## 🔧 Structure du projet

```
Cinnad'moun site/
│
├── index.html          ← Page principale
├── script.js           ← Logique frontend + appel backend
├── styles.css          ← Tous les styles
├── config.js           ← Clé publique Stripe (pk_live_...)
├── success.html        ← Page après paiement réussi
│
├── backend/
│   ├── server.js       ← Serveur Express + Stripe
│   ├── .env            ← Clé secrète Stripe (sk_live_...)
│   ├── package.json    ← Dépendances Node.js
│   └── node_modules/   ← Modules installés
│
└── img/                ← Images du site
```

---

## 🎯 Workflow de paiement

```
1. Client remplit le formulaire
   ↓
2. Clic sur "Payer l'acompte (30%)"
   ↓
3. script.js envoie les données au backend
   ↓
4. backend/server.js crée une session Stripe
   ↓
5. Redirection vers Stripe Checkout
   ↓
6. Client paie avec sa carte
   ↓
7. Stripe redirige vers success.html ✅
```

---

## 📧 Recevoir les notifications de commande

Dans le webhook (`backend/server.js` ligne ~70), vous pouvez ajouter :

```javascript
case 'checkout.session.completed':
    const session = event.data.object;
    
    // Envoyer un email via SendGrid, Mailgun, etc.
    // Ou utiliser nodemailer
    
    console.log('🎉 Nouvelle commande payée !');
    console.log('Client:', session.customer_email);
    console.log('Montant:', session.amount_total / 100, '€');
    break;
```

---

## ❓ FAQ

### Le bouton de paiement ne fonctionne pas ?
✅ Vérifiez que le backend tourne : http://localhost:3000

### Erreur CORS ?
✅ Le backend autorise déjà CORS. Vérifiez l'URL dans `script.js` (ligne 256)

### Comment héberger le backend en production ?
Options gratuites/économiques :
- **Railway** (gratuit, facile)
- **Heroku** (gratuit avec limites)
- **Render** (gratuit)
- **Vercel** (Node.js supporté)
- **VPS OVH** (2-3€/mois)

### Le paiement fonctionne mais je ne reçois rien ?
✅ Configurez le webhook Stripe :
1. Dashboard → Développeurs → Webhooks
2. Ajouter : `https://votre-domaine.com/webhook`
3. Sélectionner événements : `checkout.session.completed`
4. Copier le secret webhook dans `.env` : `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 🎉 C'est prêt !

Votre système de paiement est **100% opérationnel** :

✅ Calcul automatique de l'acompte 30%
✅ Frais de livraison par zone
✅ Minimum de commande 25€
✅ Paiement sécurisé Stripe
✅ Redirection après paiement
✅ Backend Node.js fonctionnel

**Pour tester :** 
1. Backend en marche (`npm start` dans le dossier backend)
2. Ouvrir `index.html` dans un navigateur
3. Remplir une commande
4. Cliquer sur le bouton de paiement
5. Payer avec `4242 4242 4242 4242` (mode test)

Bon courage ! 🚀🥐

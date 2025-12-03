# 🎯 Configuration Stripe - Guide Rapide

## ✅ Fichiers créés

1. **config.js** - Configuration Stripe (contient votre clé publique)
2. **.gitignore** - Protège config.js de publication
3. **STRIPE_INTEGRATION.md** - Guide complet d'intégration
4. **success.html** - Page de confirmation après paiement

## 🚨 URGENT - Sécurité

**Vous avez partagé votre clé secrète LIVE publiquement !**

### À faire MAINTENANT :

1. Aller sur https://dashboard.stripe.com/test/apikeys
2. Développeurs → Clés API
3. Cliquer sur "..." à côté de votre clé secrète
4. Choisir "Roll" pour la renouveler
5. **NE PLUS JAMAIS partager cette clé**

## 🎨 Ce qui fonctionne déjà

✅ Calcul automatique des totaux
✅ Frais de livraison par zone
✅ Calcul de l'acompte de 30%
✅ Minimum de commande (25€)
✅ Interface de commande complète
✅ Bouton de paiement Stripe

## ⚠️ Ce qui manque pour activer les paiements

Pour que les paiements fonctionnent vraiment, vous devez :

### Option 1 : Backend Node.js (RECOMMANDÉ)

**Le plus simple et sécurisé**

Voir le fichier `STRIPE_INTEGRATION.md` pour le code complet.

1. Créer un dossier `backend/`
2. Installer : `npm install express stripe dotenv cors`
3. Créer `server.js` (code dans STRIPE_INTEGRATION.md)
4. Créer `.env` avec votre NOUVELLE clé secrète
5. Lancer : `node server.js`
6. Modifier le code dans `script.js` (ligne ~124)

### Option 2 : Backend PHP

Si vous avez déjà un hébergement PHP.
Voir `STRIPE_INTEGRATION.md` pour le code.

### Option 3 : Services No-Code

- Zapier + Stripe
- Make.com
- Bubble.io

## 📝 Prochaines étapes

1. **URGENT** : Renouveler votre clé secrète Stripe
2. Choisir une option (Node.js / PHP / No-Code)
3. Suivre le guide dans `STRIPE_INTEGRATION.md`
4. Tester avec les clés TEST de Stripe
5. Passer en LIVE quand tout fonctionne

## 🧪 Mode TEST (Recommandé pour commencer)

Avant de faire de vrais paiements :

1. Dans Stripe Dashboard, basculer en mode TEST
2. Récupérer vos clés TEST (pk_test_... et sk_test_...)
3. Les mettre dans `config.js` et `.env`
4. Tester avec une carte test : `4242 4242 4242 4242`

## 💳 Cartes de test Stripe

- **Succès** : 4242 4242 4242 4242
- **Échec** : 4000 0000 0000 0002
- **3D Secure** : 4000 0025 0000 3155

Date d'expiration : N'importe quelle date future
CVC : N'importe quel 3 chiffres

## 📞 Besoin d'aide ?

- Documentation Stripe : https://stripe.com/docs/checkout/quickstart
- Support Stripe : https://support.stripe.com
- Exemples de code : https://github.com/stripe-samples

## 🎯 Résumé visuel

```
[Site Web] → [Formulaire rempli] → [Clic "Payer 30%"]
    ↓
[BACKEND] ← Appel API avec les données
    ↓
[Création session Stripe]
    ↓
[Redirection vers Stripe Checkout] → Client paie
    ↓
[Success] → success.html
```

**Sans backend, le bouton affiche juste un message d'information.**

---

## 🔧 Fichiers à modifier selon votre choix

### Si vous utilisez un backend :

1. **script.js** (ligne ~124) : Modifier l'URL du backend
2. **backend/.env** : Mettre votre NOUVELLE clé secrète
3. **config.js** : Garder uniquement la clé publique

### Structure finale :

```
Cinnad'moun site/
├── index.html
├── script.js
├── styles.css
├── config.js (clé publique uniquement)
├── success.html
├── .gitignore
├── img/
├── backend/ (à créer)
│   ├── server.js
│   ├── .env (JAMAIS commit sur Git)
│   └── package.json
└── STRIPE_INTEGRATION.md (guide complet)
```

---

Bon courage ! 🚀

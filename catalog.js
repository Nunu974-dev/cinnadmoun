// Catalogue partagé (accueil + page commande) et panier persistant

// Prix des produits (€) : une seule source de vérité
const productPrices = {
    'classique-piece': 4.50,
    'classique-box4': 17.00,
    'pomme-piece': 5.00,
    'pomme-box4': 18.00,
    'cacahuete-piece': 5.50,
    'cacahuete-box4': 20.00,
    'chocolat-piece': 5.50,
    'chocolat-box4': 20.00,
    'bueno-piece': 5.50,
    'bueno-box4': 20.00,
    'box-decouverte': 21.00,
    'tiramisu-oreo': 10.00,
    'tiramisu-speculoos': 10.00
};

// Frais de livraison par zone
const deliveryFees = {
    'sud': 0,
    'ouest': 7,
    'st-leu': 5
};

// Panier : { 'classique-piece': 2, ... } conservé dans le navigateur entre les pages
const CART_KEY = 'cinnadmoun_cart';

function loadCart() {
    try {
        const raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
        const cart = {};
        Object.keys(raw).forEach(k => {
            const q = parseInt(raw[k]);
            if (productPrices[k] !== undefined && q > 0) cart[k] = q;
        });
        return cart;
    } catch (e) {
        return {};
    }
}

function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* stockage indisponible */ }
}

function clearCart() {
    try { localStorage.removeItem(CART_KEY); } catch (e) { /* ignore */ }
}

function cartCountAndTotal(cart) {
    let count = 0, total = 0;
    Object.keys(cart).forEach(k => { count += cart[k]; total += cart[k] * productPrices[k]; });
    return { count, total };
}

const euro = n => n.toFixed(2).replace('.', ',') + '€';

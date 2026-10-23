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

// Jours de livraison par zone (0 = dimanche ... 6 = samedi) et délai minimal en jours
const deliveryDays = {
    'sud': [2, 5],      // mardi, vendredi
    'ouest': [4],       // jeudi
    'st-leu': [4]       // jeudi (à confirmer)
};
const MIN_LEAD_HOURS = 72;

// Premier jour de retrait possible : la journée entière doit se situer au moins 72h après maintenant
function firstPickupDay() {
    const d = new Date(Date.now() + MIN_LEAD_HOURS * 3600 * 1000);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
}
const DELIVERY_WEEKS_AHEAD = 6;

// Panier : { 'classique-piece': 2, ... } conservé dans le navigateur entre les pages.
// Les Box Découverte sont stockées à part, avec la composition de chaque box.
const CART_KEY = 'cinnadmoun_cart';
const BOXES_KEY = 'cinnadmoun_boxes';
const BOX_SIZE = 4;
const BOX_FLAVORS = ['Nature', 'Chocolat', 'Pomme Cannelle', 'Cacahuète', 'Bueno'];

function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || ''); } catch (e) { return fallback; }
}

// [{ 'Nature': 2, 'Bueno': 2 }, { ... }] : une entrée par box
function loadBoxes() {
    const raw = readJSON(BOXES_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(b => b && BOX_FLAVORS.reduce((n, f) => n + (parseInt(b[f]) || 0), 0) === BOX_SIZE);
}

function saveBoxes(boxes) {
    try { localStorage.setItem(BOXES_KEY, JSON.stringify(boxes)); } catch (e) { /* stockage indisponible */ }
}

function loadCart() {
    const raw = readJSON(CART_KEY, {});
    const cart = {};
    Object.keys(raw || {}).forEach(k => {
        const q = parseInt(raw[k]);
        if (k !== 'box-decouverte' && productPrices[k] !== undefined && q > 0) cart[k] = q;
    });
    const boxes = loadBoxes();
    if (boxes.length) cart['box-decouverte'] = boxes.length;
    return cart;
}

// Les box ne sont pas enregistrées ici (voir saveBoxes)
function saveCart(cart) {
    const copy = Object.assign({}, cart);
    delete copy['box-decouverte'];
    try { localStorage.setItem(CART_KEY, JSON.stringify(copy)); } catch (e) { /* ignore */ }
}

function clearCart() {
    try { localStorage.removeItem(CART_KEY); localStorage.removeItem(BOXES_KEY); } catch (e) { /* ignore */ }
}

// "Nature x2, Bueno x2 | Pomme Cannelle x4" : une box par segment
function boxesToComposition(boxes) {
    return boxes.map(b => BOX_FLAVORS.filter(f => parseInt(b[f]) > 0).map(f => `${f} x${b[f]}`).join(', ')).join(' | ');
}

function cartCountAndTotal(cart) {
    let count = 0, total = 0;
    Object.keys(cart).forEach(k => { count += cart[k]; total += cart[k] * productPrices[k]; });
    return { count, total };
}

const euro = n => n.toFixed(2).replace('.', ',') + '€';

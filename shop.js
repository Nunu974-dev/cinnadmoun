// Pages vitrine (accueil, livraison) : navigation, animations, ajout au panier

// Menu mobile
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });
}

// Vidéo d'accueil (lecture forcée sur mobile)
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
    const p = heroVideo.play();
    if (p && p.catch) p.catch(() => {
        const playOnInteraction = () => {
            heroVideo.play();
            window.removeEventListener('scroll', playOnInteraction);
            window.removeEventListener('touchstart', playOnInteraction);
        };
        window.addEventListener('scroll', playOnInteraction);
        window.addEventListener('touchstart', playOnInteraction);
    });
}

// Barre de navigation au scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 100);
});

// Défilement doux vers les ancres de la page
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const navbar = document.querySelector('.navbar');
        window.scrollTo({ top: target.offsetTop - (navbar ? navbar.offsetHeight : 0), behavior: 'smooth' });
    });
});

// Apparition des cartes au scroll
if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.product-card, .feature, .contact-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ===========================
// Panier (accueil)
// ===========================
function renderShopCart() {
    if (typeof loadCart !== 'function') return;
    const cart = loadCart();
    const { count, total } = cartCountAndTotal(cart);

    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const q = cart[btn.dataset.product] || 0;
        const badge = btn.querySelector('.cart-qty');
        btn.classList.toggle('in-cart', q > 0);
        if (badge) { badge.hidden = q === 0; badge.textContent = '×' + q; }
    });

    const bar = document.getElementById('floatingCart');
    if (bar) {
        bar.hidden = count === 0;
        document.getElementById('floatingCartCount').textContent = count;
        document.getElementById('floatingCartTotal').textContent = euro(total);
    }

    const navLink = document.querySelector('.nav-links a[data-nav="order"]');
    if (navLink) {
        navLink.setAttribute('href', count ? 'commande.html' : '#produits');
        navLink.textContent = count ? `Panier (${count})` : 'Commander';
    }
}

let toastTimer;
function showCartToast(text) {
    const t = document.getElementById('cartToast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

document.addEventListener('click', e => {
    const add = e.target.closest('.add-to-cart');
    if (!add) return;
    const cart = loadCart();
    const key = add.dataset.product;
    cart[key] = (cart[key] || 0) + 1;
    saveCart(cart);
    renderShopCart();
    const title = add.closest('.product-card, .tiramisu-card')?.querySelector('.product-name, .tiramisu-name')?.textContent || '';
    showCartToast(`✓ ${title} ajouté au panier`);
});

// Retour arrière du navigateur : le panier a pu changer sur l'autre page
window.addEventListener('pageshow', renderShopCart);
document.addEventListener('DOMContentLoaded', renderShopCart);

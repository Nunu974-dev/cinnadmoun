// Retour de paiement réussi : le panier est vidé tout de suite (avant que la page ne le recharge)
if (new URLSearchParams(window.location.search).get('payment') === 'success') clearCart();

// ===========================
// Mobile Menu Toggle
// ===========================
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.classList.toggle('active');
});

// ===========================
// Force video play on mobile
// ===========================
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
    // Tenter de lancer la vidéo immédiatement
    heroVideo.play().catch(() => {
        // Si ça échoue, attendre l'interaction utilisateur
        const playOnScroll = () => {
            heroVideo.play();
            window.removeEventListener('scroll', playOnScroll);
            window.removeEventListener('touchstart', playOnScroll);
        };
        window.addEventListener('scroll', playOnScroll);
        window.addEventListener('touchstart', playOnScroll);
    });
}

// Close menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
    });
});

// ===========================
// API de paiement (PHP, même domaine que le site : pas de CORS, pas de démarrage à froid)
// ===========================
const API_URL = '/api';

// Une coupure réseau ponctuelle ne doit pas faire échouer le paiement : on retente
async function fetchWithRetry(url, options, attempts = 3) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(url, options);
            if (res.status < 502 || res.status > 504) return res;
            lastError = new Error(`Serveur indisponible (${res.status})`);
        } catch (err) {
            lastError = err;
        }
        await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
    throw lastError;
}

// ===========================
// Vérifier le retour de paiement Stripe
// ===========================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
        // Récupérer les données de commande sauvegardées
        const orderDataStr = sessionStorage.getItem('orderData');
        
        if (orderDataStr) {
            try {
                const orderData = JSON.parse(orderDataStr);
                
                // Afficher le modal de confirmation
                setTimeout(() => {
                    showModal(orderData);
                }, 500);
                
                // Nettoyer sessionStorage
                sessionStorage.removeItem('orderData');
                
                // Nettoyer l'URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('Erreur lors du chargement des données de commande:', error);
            }
        } else {
            // Si pas de données sauvegardées, afficher un message générique
            alert('✅ Paiement réussi ! Vous allez recevoir un email de confirmation.');
        }
    } else if (paymentStatus === 'cancelled') {
        alert('❌ Paiement annulé. Votre commande n\'a pas été enregistrée.');
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// ===========================
// Navbar Scroll Effect
// ===========================
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===========================
// Box Découverte Configurator
// ===========================
// Les éléments seront initialisés dans DOMContentLoaded

let boxCheckbox, boxQtyInput, boxConfigurator, flavorInputs, remainingSlots, boxConfigError;

// Afficher/masquer le configurateur
function toggleBoxConfigurator() {
    if (!boxCheckbox || !boxQtyInput || !boxConfigurator) {
        console.error('❌ Elements not found');
        return;
    }
    
    const isChecked = boxCheckbox.checked;
    const qty = parseInt(boxQtyInput.value) || 0;
    
    console.log('toggleBoxConfigurator called:', isChecked, qty);
    
    if (isChecked && qty > 0) {
        boxConfigurator.style.display = 'block';
        console.log('✅ Configurator should be visible');
    } else {
        boxConfigurator.style.display = 'none';
        resetBoxFlavors();
        console.log('❌ Configurator hidden');
    }
}

// Ces listeners sont gérés dans le bloc DOMContentLoaded ci-dessous

// Réinitialiser les saveurs
function resetBoxFlavors() {
    if (!flavorInputs) return;
    flavorInputs.forEach(input => input.value = 0);
    updateRemainingSlots();
}

// Calculer les slots restants
function updateRemainingSlots() {
    if (!flavorInputs || !remainingSlots || !boxQtyInput) return;
    
    const boxQty = parseInt(boxQtyInput.value) || 1;
    const totalSlots = boxQty * 4; // 4 saveurs par box
    
    let total = 0;
    flavorInputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });
    
    const remaining = totalSlots - total;
    remainingSlots.textContent = remaining;
    
    if (remaining < 0) {
        boxConfigError.style.display = 'block';
        boxConfigError.textContent = `❌ Trop de saveurs sélectionnées ! Vous avez ${boxQty} box(es) = ${totalSlots} places. Retirez ${Math.abs(remaining)} saveur(s).`;
        remainingSlots.style.color = '#ff4444';
    } else if (remaining > 0 && total > 0) {
        boxConfigError.style.display = 'block';
        boxConfigError.style.background = '#fff3cd';
        boxConfigError.style.borderColor = '#ffc107';
        boxConfigError.style.color = '#856404';
        boxConfigError.textContent = `⚠️ Il reste ${remaining} place(s) dans vos ${boxQty} box(es) (${totalSlots} places au total).`;
        remainingSlots.style.color = '#ffc107';
    } else if (total === totalSlots) {
        boxConfigError.style.display = 'none';
        remainingSlots.style.color = '#28a745';
    } else {
        boxConfigError.style.display = 'none';
        remainingSlots.style.color = '#666';
    }
    
    return { total, remaining };
}

// Les event listeners pour flavorInputs seront ajoutés dans DOMContentLoaded

// Fonction pour récupérer la composition de la box
function getBoxComposition() {
    // Compositions choisies sur l'accueil : une par box, séparées par " | "
    const boxes = loadBoxes();
    if (boxes.length) return boxesToComposition(boxes);
    return '';
}

// ===========================
// Smooth Scroll
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = target.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===========================
// Accordion Functionality
// ===========================
const accordionHeaders = document.querySelectorAll('.accordion-header');

accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
        const accordionItem = header.parentElement;
        const accordionContent = accordionItem.querySelector('.accordion-content');
        const isActive = header.classList.contains('active');
        
        // Close all accordions
        accordionHeaders.forEach(h => {
            h.classList.remove('active');
            h.parentElement.querySelector('.accordion-content').classList.remove('active');
        });
        
        // Open clicked accordion if it wasn't active
        if (!isActive) {
            header.classList.add('active');
            accordionContent.classList.add('active');
        }
    });
});

// ===========================
// Product Checkbox & Quantity Sync + Order Calculation
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser les éléments du configurateur Box Découverte
    boxCheckbox = document.getElementById('boxDecouverteCheckbox');
    boxQtyInput = document.getElementById('boxDecouverteQty');
    boxConfigurator = document.getElementById('boxConfigurator');
    flavorInputs = document.querySelectorAll('.box-flavor-qty');
    remainingSlots = document.getElementById('boxRemainingSlots');
    boxConfigError = document.getElementById('boxConfigError');
    
    console.log('🔍 Box elements initialized:', {
        boxCheckbox: !!boxCheckbox,
        boxQtyInput: !!boxQtyInput,
        boxConfigurator: !!boxConfigurator,
        flavorInputs: flavorInputs.length
    });
    
    // Ajouter les event listeners pour les flavor inputs
    if (flavorInputs && flavorInputs.length > 0) {
        flavorInputs.forEach(input => {
            input.addEventListener('input', updateRemainingSlots);
        });
    }
    
    const checkboxes = document.querySelectorAll('.option-group input[type="checkbox"]');
    const citySelect = document.getElementById('city');
    
    checkboxes.forEach(checkbox => {
        const qtyInput = checkbox.closest('.option-group').querySelector('.qty-input');
        
        checkbox.addEventListener('change', () => {
            if (checkbox.checked && qtyInput.value === '0') {
                qtyInput.value = '1';
            } else if (!checkbox.checked) {
                qtyInput.value = '0';
            }
            // Afficher le configurateur pour la Box Découverte immédiatement
            if (checkbox.id === 'boxDecouverteCheckbox') {
                toggleBoxConfigurator();
                console.log('✅ Checkbox changed, configurator called');
            }
            updateOrderSummary();
        });
        
        qtyInput.addEventListener('change', () => {
            if (parseInt(qtyInput.value) > 0) {
                checkbox.checked = true;
            } else {
                checkbox.checked = false;
                qtyInput.value = '0';
            }
            // Afficher le configurateur pour la Box Découverte immédiatement
            if (qtyInput.id === 'boxDecouverteQty') {
                toggleBoxConfigurator();
                updateRemainingSlots(); // Recalculer le nombre de places
                console.log('✅ Qty changed, configurator called');
            }
            updateOrderSummary();
        });
        
        qtyInput.addEventListener('input', () => {
            if (parseInt(qtyInput.value) < 0) {
                qtyInput.value = '0';
            }
            // Afficher le configurateur si on change la quantité manuellement
            if (qtyInput.id === 'boxDecouverteQty') {
                toggleBoxConfigurator();
                updateRemainingSlots(); // Recalculer le nombre de places
            }
            updateOrderSummary();
        });
    });
    
    // Mise à jour lors du changement de point de retrait
    const pickupPointSelect = document.getElementById('pickupPoint');
    pickupPointSelect.addEventListener('change', () => { refreshDeliveryDates(); updateOrderSummary(); });
    document.getElementById('deliveryDate').addEventListener('change', updateOrderSummary);
});

// Fonction pour calculer et afficher le récapitulatif
function updateOrderSummary() {
    renderCart();
    const orderSummary = document.getElementById('orderSummary');
    const summaryContent = document.getElementById('orderSummaryContent');
    const subtotalEl = document.getElementById('subtotal');
    const deliveryFeesEl = document.getElementById('deliveryFees');
    const totalAmountEl = document.getElementById('totalAmount');
    const depositAmountEl = document.getElementById('depositAmount');
    const depositBtnAmountEl = document.getElementById('depositBtnAmount');
    const stripePaymentBtn = document.getElementById('stripePaymentBtn');
    const minimumOrderNote = document.getElementById('minimumOrderNote');
    
    let subtotal = 0;
    let orderItems = [];
    
    // Collecter tous les produits sélectionnés
    const allCheckboxes = document.querySelectorAll('.accordion-content input[type="checkbox"]:checked');
    
    allCheckboxes.forEach(checkbox => {
        const qtyInput = checkbox.closest('.option-group').querySelector('.qty-input');
        const quantity = parseInt(qtyInput.value);
        
        if (quantity > 0) {
            const productName = checkbox.closest('.accordion-item').querySelector('.accordion-title').textContent;
            const optionLabel = checkbox.closest('label').querySelector('span').textContent;
            const checkboxName = checkbox.getAttribute('name');
            const price = productPrices[checkboxName] || 0;
            const lineTotal = price * quantity;
            
            subtotal += lineTotal;
            
            // Si c'est la Box Découverte, ajouter la composition
            let composition = '';
            if (checkboxName === 'box-decouverte') {
                composition = getBoxComposition();
                
                // Vérifier que la composition est valide (nombre de saveurs = nombre de slots)
                const boxQty = parseInt(checkbox.closest('.option-group').querySelector('.qty-input').value) || 1;
                const totalSlots = boxQty * 4; // 4 saveurs par box
                const { total } = updateRemainingSlots();
                if (total !== totalSlots) {
                    // Ne pas ajouter la box si la composition n'est pas complète
                    return;
                }
            }
            
            orderItems.push({
                name: productName,
                option: optionLabel,
                quantity: quantity,
                unitPrice: price,
                total: lineTotal,
                composition: composition
            });
        }
    });
    
    // Afficher/masquer le récapitulatif
    if (orderItems.length === 0) {
        orderSummary.style.display = 'none';
        stripePaymentBtn.style.display = 'none';
        minimumOrderNote.style.display = 'none';
        document.getElementById('balanceBtnNote').style.display = 'none';
        return;
    }
    
    // Construire le contenu du récapitulatif
    let summaryHTML = '<ul class="order-items-list">';
    orderItems.forEach(item => {
        summaryHTML += `
            <li>
                <span>${item.name} - ${item.option} × ${item.quantity}</span>
                <strong>${item.total.toFixed(2)}€</strong>
            </li>`;
        
        // Afficher la composition si c'est une Box Découverte
        if (item.composition) {
            summaryHTML += `
            <li style="padding-left: 20px; font-size: 0.9em; color: #666;">
                <span>📦 Composition: ${item.composition}</span>
            </li>`;
        }
    });
    summaryHTML += '</ul>';
    summaryContent.innerHTML = summaryHTML;
    
    // Calculer les frais de livraison selon le point de retrait
    const pickupPointSelect = document.getElementById('pickupPoint');
    const selectedOption = pickupPointSelect.options[pickupPointSelect.selectedIndex];
    const zone = selectedOption ? selectedOption.getAttribute('data-zone') : null;
    const deliveryFee = zone ? deliveryFees[zone] : 0;
    
    // Afficher le sous-total
    subtotalEl.textContent = subtotal.toFixed(2) + '€';
    
    // Afficher les frais de livraison
    if (zone) {
        if (deliveryFee === 0) {
            deliveryFeesEl.textContent = 'GRATUIT ✨';
        } else {
            deliveryFeesEl.textContent = deliveryFee.toFixed(2) + '€';
        }
    } else {
        deliveryFeesEl.textContent = 'Sélectionnez une ville';
    }
    
    // Calculer le total
    const total = subtotal + deliveryFee;
    totalAmountEl.textContent = total.toFixed(2) + '€';
    
    // Acompte (20%) et reste à régler au retrait
    const deposit = total * (STRIPE_CONFIG.depositPercent / 100);
    const balance = total - deposit;
    const money = n => n.toFixed(2).replace('.', ',') + '€';
    depositAmountEl.textContent = money(deposit);
    depositBtnAmountEl.textContent = money(deposit);
    document.getElementById('balanceAmount').textContent = money(balance);
    document.getElementById('balanceBtnAmount').textContent = money(balance);

    // Le récapitulatif et le paiement n'apparaissent qu'une fois le lieu ET la date choisis
    const dateChosen = document.getElementById('deliveryDate').value !== '';
    const ready = !!zone && dateChosen;
    orderSummary.style.display = ready ? 'block' : 'none';
    const balanceNote = document.getElementById('balanceBtnNote');

    if (subtotal < 25) {
        minimumOrderNote.style.display = 'block';
        stripePaymentBtn.style.display = 'none';
        balanceNote.style.display = 'none';
    } else {
        minimumOrderNote.style.display = 'none';
        stripePaymentBtn.style.display = ready ? 'block' : 'none';
        balanceNote.style.display = ready ? 'block' : 'none';
    }
}

// ===========================
// Dates de retrait : uniquement les jours de livraison du point choisi
// ===========================
function localISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function refreshDeliveryDates() {
    const select = document.getElementById('deliveryDate');
    const pickup = document.getElementById('pickupPoint');
    const hint = document.getElementById('deliveryDateHint');
    const opt = pickup.options[pickup.selectedIndex];
    const zone = opt ? opt.getAttribute('data-zone') : null;
    const previous = select.value;

    if (!zone || !deliveryDays[zone]) {
        select.disabled = true;
        select.innerHTML = '<option value="">Choisissez d\'abord un point de rendez-vous</option>';
        hint.textContent = '📅 Les dates proposées dépendent du point de rendez-vous choisi.';
        return;
    }

    const days = deliveryDays[zone];
    const first = firstPickupDay();

    let html = '<option value="">Choisissez une date</option>';
    for (let i = 0; i < DELIVERY_WEEKS_AHEAD * 7; i++) {
        const d = new Date(first);
        d.setDate(first.getDate() + i);
        if (!days.includes(d.getDay())) continue;
        const iso = localISO(d);
        const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        html += `<option value="${iso}">${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
    }
    select.innerHTML = html;
    select.disabled = false;
    if (previous && select.querySelector(`option[value="${previous}"]`)) select.value = previous;

    const names = days.map(n => ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][n]);
    hint.textContent = `📅 Jours de livraison pour ce point : ${names.join(' et ')}.`;
}

// ===========================
// Stripe Payment Integration
// ===========================
const stripe = Stripe(STRIPE_CONFIG.publicKey);

// ===========================
// Validation formulaire avec messages clairs
// ===========================
function validateOrderForm() {
    const fields = [
        {
            id: 'firstName',
            label: 'Prénom',
            check: v => v.trim() !== ''
        },
        {
            id: 'lastName',
            label: 'Nom',
            check: v => v.trim() !== ''
        },
        {
            id: 'email',
            label: 'Email',
            check: v => v.trim() !== '',
            extra: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Email invalide (ex: prenom@exemple.re)'
        },
        {
            id: 'phone',
            label: 'Numéro de téléphone',
            check: v => v.trim() !== ''
        },
        {
            id: 'pickupPoint',
            label: 'Point de retrait (Centre Commercial)',
            check: v => v !== ''
        },
        {
            id: 'deliveryDate',
            label: 'Date de retrait souhaitée',
            check: v => v !== '',
            extra: v => {
                const selected = new Date(v + 'T00:00:00'); // forcer heure locale
                return selected >= firstPickupDay() ? null : 'La date de retrait doit être au minimum dans 72h';
            }
        }
    ];

    clearFormErrors();
    const errors = [];

    fields.forEach(field => {
        const el = document.getElementById(field.id);
        const val = el ? el.value : '';

        if (!field.check(val)) {
            errors.push(`${field.label} est obligatoire`);
            if (el) el.classList.add('field-error');
        } else {
            if (field.extra) {
                const extraMsg = field.extra(val);
                if (extraMsg) {
                    errors.push(extraMsg);
                    if (el) el.classList.add('field-error');
                }
            }
        }
    });

    return errors;
}

function clearFormErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
    const existing = document.getElementById('formErrorBanner');
    if (existing) existing.remove();
}

function showFormErrors(errors) {
    clearFormErrors();
    const banner = document.createElement('div');
    banner.id = 'formErrorBanner';
    banner.className = 'form-error-banner';
    banner.innerHTML =
        '<strong>⚠️ Votre commande ne peut pas être validée :</strong>' +
        '<ul>' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>';
    const form = document.getElementById('orderForm');
    form.insertBefore(banner, form.firstChild);
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Effacer les erreurs dès que le client corrige un champ
document.addEventListener('DOMContentLoaded', () => {
    ['firstName', 'lastName', 'email', 'phone', 'pickupPoint', 'deliveryDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => el.classList.remove('field-error'));
            el.addEventListener('change', () => el.classList.remove('field-error'));
        }
    });
});

document.getElementById('stripePaymentBtn').addEventListener('click', async function() {
    // Valider tous les champs avec messages explicites
    const errors = validateOrderForm();
    if (errors.length > 0) {
        showFormErrors(errors);
        return;
    }

    // Collecter les données du formulaire
    const formData = collectFormData();

    if (!formData.isValid) {
        showFormErrors([formData.error]);
        return;
    }
    
    // Effacer un éventuel bandeau d'erreur précédent
    const prevError = document.getElementById('paymentErrorBanner');
    if (prevError) prevError.remove();

    // Sauvegarder les données de commande dans sessionStorage pour la page de retour
    sessionStorage.setItem('orderData', JSON.stringify(formData));
    
    const btn = document.getElementById('stripePaymentBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span style="display: inline-block; animation: pulse 1.5s infinite;">⏳</span> Connexion sécurisée en cours...';
    
    // Ajouter style d'animation si pas déjà présent
    if (!document.getElementById('pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'pulse-animation';
        style.textContent = '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }';
        document.head.appendChild(style);
    }
    
    const startTime = Date.now();
    console.log('🕐 Début création session Stripe');
    
    try {
        // Créer la session de paiement Stripe
        console.log('⏱️ Envoi requête au backend...');
        const response = await fetchWithRetry(`${API_URL}/create-checkout-session.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Math.round(formData.deposit * 100), // Convertir en centimes
                customerInfo: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    pickupPoint: formData.pickupPoint,
                    city: formData.city,
                    zone: formData.zone,
                    deliveryDate: formData.deliveryDate,
                    message: formData.message
                },
                orderDetails: {
                    products: formData.products,
                    productSummary: formData.products.map(p => `${p.name} (${p.option}) × ${p.quantity}`).join(', '),
                    subtotal: formData.subtotal,
                    deliveryFee: formData.deliveryFee,
                    total: formData.total,
                    deposit: formData.deposit,
                    balance: formData.balance
                },
                successUrl: `${window.location.origin}${window.location.pathname}?payment=success`,
                cancelUrl: `${window.location.origin}${window.location.pathname}?payment=cancelled`
            })
        });

        console.log(`⏱️ Réponse reçue du backend: ${Date.now() - startTime}ms`);

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.details
                ? `${errorData.error} : ${errorData.details}`
                : (errorData.error || 'Erreur lors de la création de la session de paiement');
            throw new Error(errorMsg);
        }

        const { sessionId, url } = await response.json();
        console.log(`⏱️ Session ID reçu: ${Date.now() - startTime}ms`);
        
        // Rediriger vers Stripe Checkout (URL directe, redirectToCheckout est déprécié)
        console.log('⏱️ Redirection vers Stripe...');
        if (url) {
            window.location.href = url;
            return;
        }
        const result = await stripe.redirectToCheckout({ sessionId });
        console.log(`⏱️ Total avant redirection: ${Date.now() - startTime}ms`);
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur paiement Stripe:', error);
        if (error instanceof TypeError) {
            error = new Error('Connexion au serveur de paiement impossible. Vérifiez votre connexion internet et réessayez dans quelques secondes.');
        }

        // Réactiver le bouton
        btn.disabled = false;
        btn.innerHTML = originalText;

        // Afficher le bandeau d'erreur au-dessus du bouton de paiement
        let paymentErrorBanner = document.getElementById('paymentErrorBanner');
        if (!paymentErrorBanner) {
            paymentErrorBanner = document.createElement('div');
            paymentErrorBanner.id = 'paymentErrorBanner';
            paymentErrorBanner.className = 'form-error-banner';
            btn.parentNode.insertBefore(paymentErrorBanner, btn);
        }
        paymentErrorBanner.innerHTML =
            '<strong>❌ Votre paiement n\'a pas pu être traité</strong>' +
            '<p style="margin: 6px 0 0;">' + error.message + '</p>' +
            '<p style="margin: 6px 0 0; font-size: 0.88em;">Veuillez réessayer ou contactez-nous si le problème persiste.</p>';
        paymentErrorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

// Fonction pour collecter toutes les données du formulaire
function collectFormData() {
    const form = document.getElementById('orderForm');
    const pickupPointSelect = document.getElementById('pickupPoint');
    const selectedOption = pickupPointSelect.options[pickupPointSelect.selectedIndex];
    const zone = selectedOption ? selectedOption.getAttribute('data-zone') : null;
    const city = selectedOption ? selectedOption.getAttribute('data-city') : null;
    const pickupPoint = pickupPointSelect.value;
    
    if (!zone || !pickupPoint) {
        return {
            isValid: false,
            error: 'Veuillez sélectionner un point de retrait.'
        };
    }
    
    let subtotal = 0;
    let products = [];
    
    // Collecter les produits
    const allCheckboxes = document.querySelectorAll('.accordion-content input[type="checkbox"]:checked');
    
    allCheckboxes.forEach(checkbox => {
        const qtyInput = checkbox.closest('.option-group').querySelector('.qty-input');
        const quantity = parseInt(qtyInput.value);
        
        if (quantity > 0) {
            const optionLabel = checkbox.closest('label').querySelector('span').textContent;
            const checkboxName = checkbox.getAttribute('name');
            const productName = checkboxName.startsWith('tiramisu')
                ? optionLabel.split(' - ')[0].trim()
                : checkbox.closest('.accordion-item').querySelector('.accordion-title').textContent.trim();
            console.log(`🔍 Produit détecté - name: "${checkboxName}", quantity: ${quantity}`);
            const price = productPrices[checkboxName] || 0;
            const lineTotal = price * quantity;
            
            // Si c'est la Box Découverte, ajouter la composition
            let composition = '';
            if (checkboxName === 'box-decouverte') {
                console.log('📦 Box Découverte détectée, appel getBoxComposition()...');
                composition = getBoxComposition();
                console.log('📦 Composition reçue:', composition);
            }
            
            subtotal += lineTotal;
            products.push({
                name: productName,
                option: optionLabel,
                quantity: quantity,
                unitPrice: price,
                total: lineTotal,
                composition: composition || undefined  // N'ajouter que si non vide
            });
        }
    });
    
    if (products.length === 0) {
        return {
            isValid: false,
            error: 'Votre panier est vide : ajoutez au moins une création.'
        };
    }

    const boxLine = products.find(p => p.composition !== undefined || /box.*d[ée]couverte/i.test(p.name));
    if (boxLine) {
        const { total: chosen } = updateRemainingSlots();
        const needed = boxLine.quantity * 4;
        if (chosen !== needed) {
            return {
                isValid: false,
                error: `Composez votre Box Découverte : ${chosen}/${needed} saveurs choisies.`
            };
        }
    }
    
    if (subtotal < 25) {
        return {
            isValid: false,
            error: 'Le montant minimum de commande est de 25€.'
        };
    }
    
    const deliveryFee = deliveryFees[zone] || 0;
    const total = subtotal + deliveryFee;
    const deposit = total * (STRIPE_CONFIG.depositPercent / 100);
    
    return {
        isValid: true,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        pickupPoint: pickupPoint,
        city: city,
        zone: zone,
        deliveryDate: document.getElementById('deliveryDate').value,
        message: document.getElementById('message').value,
        products: products,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: total,
        deposit: deposit,
        balance: total - deposit
    };
}

// Fonction pour envoyer la commande par email (backup)
function sendOrderEmail(data) {
    const emailBody = createDetailedEmailBody(data);
    const mailtoLink = `mailto:contact@cinnadmoun.re?subject=Nouvelle commande avec paiement - ${data.firstName} ${data.lastName}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
}

// ===========================
// Form Submission (Version obsolète - remplacée par Stripe)
// ===========================
const orderForm = document.getElementById('orderForm');
const modal = document.getElementById('confirmationModal');

// On garde l'ancien système de soumission comme fallback
orderForm.addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Veuillez utiliser le bouton de paiement pour valider votre commande.');
});

// ===========================
// Create Email Body (Version détaillée avec paiement)
// ===========================
function createDetailedEmailBody(data) {
    let body = `NOUVELLE COMMANDE CINNAD'MOUN - AVEC PAIEMENT\n\n`;
    body += `═══════════════════════════════════\n\n`;
    
    body += `💳 PAIEMENT\n`;
    body += `-----------------------------------\n`;
    body += `Acompte payé (20%): ${data.deposit.toFixed(2)}€\n`;
    body += `Solde à la livraison: ${data.balance.toFixed(2)}€\n`;
    body += `Total: ${data.total.toFixed(2)}€\n\n`;
    
    body += `INFORMATIONS CLIENT\n`;
    body += `-----------------------------------\n`;
    body += `Nom: ${data.firstName} ${data.lastName}\n`;
    body += `Email: ${data.email}\n`;
    body += `Téléphone: ${data.phone}\n\n`;
    
    body += `POINT DE RETRAIT\n`;
    body += `-----------------------------------\n`;
    body += `${data.pickupPoint}\n`;
    body += `Zone: ${data.zone.toUpperCase()}\n`;
    body += `Frais de livraison: ${data.deliveryFee === 0 ? 'GRATUIT' : data.deliveryFee.toFixed(2) + '€'}\n\n`;
    
    body += `DÉTAILS DE LA COMMANDE\n`;
    body += `-----------------------------------\n`;
    body += `Date de retrait souhaitée: ${formatDate(data.deliveryDate)}\n\n`;
    
    body += `PRODUITS COMMANDÉS\n`;
    body += `-----------------------------------\n`;
    data.products.forEach(product => {
        body += `• ${product.name} - ${product.option} × ${product.quantity} = ${product.total.toFixed(2)}€\n`;
    });
    body += `\nSous-total produits: ${data.subtotal.toFixed(2)}€\n`;
    body += `Frais de livraison: ${data.deliveryFee === 0 ? 'GRATUIT' : data.deliveryFee.toFixed(2) + '€'}\n`;
    body += `TOTAL: ${data.total.toFixed(2)}€\n`;
    
    if (data.message) {
        body += `\nREMARQUES\n`;
        body += `-----------------------------------\n`;
        body += `${data.message}\n`;
    }
    
    body += `\n═══════════════════════════════════\n\n`;
    body += `Cette commande a été générée depuis le site web Cinnad'moun.\n`;
    body += `Le client a payé un acompte de ${data.deposit.toFixed(2)}€.\n`;
    body += `Le solde de ${data.balance.toFixed(2)}€ est à récupérer à la livraison.\n`;
    
    return body;
}

// ===========================
// Create Email Body (Version simple - legacy)
// ===========================
function createEmailBody(data) {
    let body = `NOUVELLE COMMANDE CINNAD'MOUN\n\n`;
    body += `═══════════════════════════════════\n\n`;
    
    body += `INFORMATIONS CLIENT\n`;
    body += `-----------------------------------\n`;
    body += `Nom: ${data.firstName} ${data.lastName}\n`;
    body += `Email: ${data.email}\n`;
    body += `Téléphone: ${data.phone}\n\n`;
    
    body += `DÉTAILS DE LA COMMANDE\n`;
    body += `-----------------------------------\n`;
    body += `Date de retrait souhaitée: ${formatDate(data.deliveryDate)}\n\n`;
    
    body += `PRODUITS COMMANDÉS\n`;
    body += `-----------------------------------\n`;
    data.products.forEach(product => {
        body += `• ${product.name} - ${product.option} - Quantité: ${product.quantity}\n`;
    });
    
    if (data.message) {
        body += `\nREMARQUES\n`;
        body += `-----------------------------------\n`;
        body += `${data.message}\n`;
    }
    
    body += `\n═══════════════════════════════════\n\n`;
    body += `Cette commande a été générée depuis le site web Cinnad'moun.\n`;
    body += `Merci de contacter le client pour confirmer la commande.\n`;
    
    return body;
}

// ===========================
// Format Date
// ===========================
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', options);
}

// ===========================
// Modal Functions
// ===========================
function showModal(orderData) {
    // Remplir les informations du modal
    if (orderData) {
        // Produits
        const modalOrderItems = document.getElementById('modalOrderItems');
        modalOrderItems.innerHTML = orderData.products.map(item => `
            <div class="modal-order-item">
                <div class="modal-item-header">
                    <div>
                        <div class="modal-item-name">${item.name}</div>
                        <div class="modal-item-details">${item.option} × ${item.quantity}</div>
                    </div>
                    <div class="modal-item-price">${item.total.toFixed(2)}€</div>
                </div>
                ${item.composition ? `
                    <div class="modal-item-composition">
                        <strong>📦 Composition :</strong>
                        <ul>${item.composition.split('|').map((b, i) => `<li><strong>Box ${i + 1} :</strong> ${b.trim()}</li>`).join('')}</ul>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // Point de retrait
        document.getElementById('modalPickupPoint').textContent = orderData.pickupPoint;
        
        // Date de retrait
        const deliveryDate = new Date(orderData.deliveryDate);
        const formattedDate = deliveryDate.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        document.getElementById('modalDeliveryDate').textContent = formattedDate;
        
        // Montants
        document.getElementById('modalSubtotal').textContent = `${orderData.subtotal.toFixed(2)}€`;
        document.getElementById('modalDeliveryFee').textContent = `${orderData.deliveryFee.toFixed(2)}€`;
        document.getElementById('modalTotal').textContent = `${orderData.total.toFixed(2)}€`;
        document.getElementById('modalDeposit').textContent = `${orderData.deposit.toFixed(2)}€`;
        
        const balance = orderData.total - orderData.deposit;
        document.getElementById('modalBalance').textContent = `${balance.toFixed(2)}€`;
        
        // Email
        document.getElementById('modalEmail').textContent = orderData.email;
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Réinitialiser le formulaire après fermeture
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 300);
}

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// ===========================
// Scroll Animations
// ===========================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.product-card, .feature, .contact-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ===========================
// Form Validation Enhancement
// ===========================
const inputs = document.querySelectorAll('input[required], textarea[required]');

inputs.forEach(input => {
    input.addEventListener('invalid', (e) => {
        e.preventDefault();
        input.classList.add('error');
    });
    
    input.addEventListener('input', () => {
        input.classList.remove('error');
    });
});

// Add error styling
const style = document.createElement('style');
style.textContent = `
    .error {
        border-color: #e74c3c !important;
        animation: shake 0.3s ease;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// ===========================
// Console Welcome Message
// ===========================
console.log('%c🥐 Bienvenue sur Cinnad\'moun ! 🥐', 'font-size: 20px; font-weight: bold; color: #8B6F47;');
console.log('%cDes cinnamon rolls artisanaux de La Réunion', 'font-size: 14px; color: #666;');


// ===========================
// Panier (page commande) : le panier enregistré alimente les contrôles du formulaire
// ===========================
function cartControls(name) {
    return {
        checkbox: document.querySelector(`.products-selection input[type="checkbox"][name="${name}"]`),
        qty: document.querySelector(`.products-selection input[name="${name}-qty"]`)
    };
}

function setCartQty(name, qty) {
    const { qty: qtyInput } = cartControls(name);
    if (!qtyInput) return;
    qtyInput.value = String(Math.max(0, qty));
    qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
}

let boxes = [];

function cartLinesData() {
    const lines = [];
    document.querySelectorAll('.products-selection input[type="checkbox"]:checked').forEach(cb => {
        const name = cb.getAttribute('name');
        if (name === 'box-decouverte') return;   // les box sont listées une par une ci-dessous
        const { qty } = cartControls(name);
        const quantity = parseInt(qty.value) || 0;
        if (quantity <= 0) return;
        const label = cb.closest('label').querySelector('span').textContent.split(' - ')[0].trim();
        const isTiramisu = name.startsWith('tiramisu');
        const title = isTiramisu
            ? label
            : cb.closest('.accordion-item').querySelector('.accordion-title').textContent.trim();
        const price = productPrices[name] || 0;
        lines.push({ name, title, label: isTiramisu ? 'Barquette 750g' : label, quantity, price, total: price * quantity });
    });
    boxes.forEach((box, i) => {
        const comp = BOX_FLAVORS.filter(f => box[f] > 0).map(f => `${f} ×${box[f]}`).join(', ');
        lines.push({ name: 'box-decouverte', boxIndex: i, title: `Box Découverte n°${i + 1}`, label: comp, quantity: 1, price: productPrices['box-decouverte'], total: productPrices['box-decouverte'] });
    });
    return lines;
}

let hydratingCart = true;

// Aligne les contrôles d'origine du formulaire (quantité + saveurs) sur les box du panier
function syncBoxInputs() {
    const totals = {};
    boxes.forEach(b => BOX_FLAVORS.forEach(f => { totals[f] = (totals[f] || 0) + (parseInt(b[f]) || 0); }));
    document.querySelectorAll('.box-flavor-qty').forEach(input => { input.value = totals[input.dataset.flavor] || 0; });
    setCartQty('box-decouverte', boxes.length);
    updateRemainingSlots();
}

function renderCart() {
    const list = document.getElementById('cartLines');
    if (!list) return;
    const lines = cartLinesData();

    // Enregistrer le panier pour la prochaine visite / retour au paiement annulé
    if (!hydratingCart) {
        const cart = {};
        lines.forEach(l => { cart[l.name] = l.quantity; });
        saveCart(cart);
    }

    list.innerHTML = lines.map(l => l.boxIndex !== undefined ? `
        <li class="cart-line">
            <div class="cart-line-info">
                <strong>${l.title}</strong>
                <span>${l.label}</span>
            </div>
            <div class="cart-line-actions">
                <strong class="cart-line-total">${euro(l.total)}</strong>
                <button type="button" class="cart-remove" data-box-remove="${l.boxIndex}" aria-label="Supprimer cette box">🗑</button>
            </div>
        </li>` : `
        <li class="cart-line">
            <div class="cart-line-info">
                <strong>${l.title}</strong>
                <span>${l.label} · ${euro(l.price)}</span>
            </div>
            <div class="cart-line-actions">
                <button type="button" class="cart-step" data-cart="dec" data-product="${l.name}" aria-label="Retirer un">−</button>
                <span class="cart-line-qty">${l.quantity}</span>
                <button type="button" class="cart-step" data-cart="inc" data-product="${l.name}" aria-label="Ajouter un">+</button>
                <strong class="cart-line-total">${euro(l.total)}</strong>
                <button type="button" class="cart-remove" data-cart="remove" data-product="${l.name}" aria-label="Supprimer">🗑</button>
            </div>
        </li>`).join('');

    // Panier vide : on ne montre que le message, pas le formulaire
    document.getElementById('cartEmpty').hidden = lines.length > 0;
    document.getElementById('cartContinue').hidden = lines.length === 0;
    document.getElementById('orderForm').classList.toggle('cart-is-empty', lines.length === 0);
}

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', e => {
        const rm = e.target.closest('[data-box-remove]');
        if (rm) {
            boxes.splice(parseInt(rm.dataset.boxRemove), 1);
            saveBoxes(boxes);
            syncBoxInputs();
            return;
        }
        const act = e.target.closest('[data-cart]');
        if (!act) return;
        const name = act.dataset.product;
        const { qty } = cartControls(name);
        const cur = parseInt(qty.value) || 0;
        setCartQty(name, act.dataset.cart === 'inc' ? cur + 1 : act.dataset.cart === 'dec' ? cur - 1 : 0);
    });

    // Recharger le panier choisi sur l'accueil
    const saved = loadCart();
    boxes = loadBoxes();
    Object.keys(saved).forEach(name => { if (name !== 'box-decouverte') setCartQty(name, saved[name]); });
    syncBoxInputs();
    hydratingCart = false;
    renderCart();
});

// Bulle "Commandez plus bas" : disparaît dès qu'on commence à scroller
(function () {
    const bubble = document.querySelector('.scroll-bubble');
    if (!bubble) return;
    const update = () => bubble.classList.toggle('hidden', window.scrollY > 40);
    window.addEventListener('scroll', update, { passive: true });
    update();
})();

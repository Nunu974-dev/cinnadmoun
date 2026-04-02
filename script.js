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
// "Réveiller" le backend Render au chargement (évite 1min d'attente)
// ===========================
const BACKEND_URL = 'https://cinnadmoun.onrender.com';

fetch(`${BACKEND_URL}/`)
    .then(res => res.json())
    .then(data => console.log('✅ Backend prêt:', data.status))
    .catch(err => console.log('⚠️ Backend en cours de réveil...'));

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
    if (!flavorInputs) {
        console.log('⚠️ flavorInputs not found');
        return '';
    }
    console.log('🔍 flavorInputs trouvés:', flavorInputs.length);
    const composition = [];
    flavorInputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        console.log(`  - ${input.dataset.flavor}: ${qty} (value="${input.value}")`);
        if (qty > 0) {
            const flavor = input.dataset.flavor;
            composition.push(`${flavor} x${qty}`);
        }
    });
    const result = composition.join(', ');
    console.log('🎨 getBoxComposition() result:', result);
    return result;
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

// Prix des produits
const productPrices = {
    'classique-piece': 4.50,
    'classique-box4': 18.00,
    'pomme-piece': 5.00,
    'pomme-box4': 20.00,
    'cacahuete-piece': 5.50,
    'cacahuete-box4': 22.00,
    'chocolat-piece': 5.50,
    'chocolat-box4': 22.00,
    'bueno-piece': 5.50,
    'bueno-box4': 22.00,
    'box-decouverte': 21.00,
    'tiramisu-oreo': 10.00,
    'tiramisu-speculoos': 10.00
};

// Frais de livraison par zone
const deliveryFees = {
    'sud': 0,
    'ouest': 5,
    'nord': 7,
    'est': 5
};

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
    pickupPointSelect.addEventListener('change', updateOrderSummary);
});

// Fonction pour calculer et afficher le récapitulatif
function updateOrderSummary() {
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
        return;
    }
    
    orderSummary.style.display = 'block';
    
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
    
    // Calculer l'acompte (30%)
    const deposit = total * (STRIPE_CONFIG.depositPercent / 100);
    depositAmountEl.textContent = deposit.toFixed(2) + '€';
    depositBtnAmountEl.textContent = deposit.toFixed(2) + '€';
    
    // Vérifier le minimum de commande (25€)
    if (subtotal < 25) {
        minimumOrderNote.style.display = 'block';
        stripePaymentBtn.style.display = 'none';
    } else {
        minimumOrderNote.style.display = 'none';
        if (zone) {
            stripePaymentBtn.style.display = 'block';
        }
    }
}

// ===========================
// Set Minimum Date for Delivery
// ===========================
const deliveryDateInput = document.getElementById('deliveryDate');
const today = new Date();
const minDate = new Date(today);
minDate.setDate(today.getDate() + 2); // Minimum 2 days in advance

deliveryDateInput.min = minDate.toISOString().split('T')[0];

// ===========================
// Stripe Payment Integration
// ===========================
const stripe = Stripe(STRIPE_CONFIG.publicKey);

document.getElementById('stripePaymentBtn').addEventListener('click', async function() {
    // Valider le formulaire avant de continuer
    const form = document.getElementById('orderForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Collecter les données du formulaire
    const formData = collectFormData();
    
    if (!formData.isValid) {
        alert(formData.error);
        return;
    }
    
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
        const response = await fetch(`${BACKEND_URL}/create-checkout-session`, {
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
            throw new Error(errorData.error || 'Erreur lors de la création de la session de paiement');
        }

        const { sessionId } = await response.json();
        console.log(`⏱️ Session ID reçu: ${Date.now() - startTime}ms`);
        
        // Rediriger vers Stripe Checkout
        console.log('⏱️ Redirection vers Stripe...');
        const result = await stripe.redirectToCheckout({ sessionId });
        console.log(`⏱️ Total avant redirection: ${Date.now() - startTime}ms`);
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur paiement Stripe:', error);
        
        // Réactiver le bouton
        btn.disabled = false;
        btn.innerHTML = originalText;
        
        alert(
            '❌ Erreur de paiement\n\n' +
            error.message + '\n\n' +
            'Veuillez réessayer ou contactez-nous si le problème persiste.'
        );
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
            const productName = checkbox.closest('.accordion-item').querySelector('.accordion-title').textContent;
            const optionLabel = checkbox.closest('label').querySelector('span').textContent;
            const checkboxName = checkbox.getAttribute('name');
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
            error: 'Veuillez sélectionner au moins un produit.'
        };
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
    body += `Acompte payé (30%): ${data.deposit.toFixed(2)}€\n`;
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
                        <strong>📦 Composition personnalisée :</strong> ${item.composition}
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
        document.getElementById('orderForm').reset();
        location.reload(); // Recharger la page pour réinitialiser complètement
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

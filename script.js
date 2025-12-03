// ===========================
// Mobile Menu Toggle
// ===========================
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.classList.toggle('active');
});

// Close menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
    });
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
const boxCheckbox = document.getElementById('boxDecouverteCheckbox');
const boxQtyInput = document.getElementById('boxDecouverteQty');
const boxConfigurator = document.getElementById('boxConfigurator');
const flavorInputs = document.querySelectorAll('.box-flavor-qty');
const remainingSlots = document.getElementById('boxRemainingSlots');
const boxConfigError = document.getElementById('boxConfigError');

// Afficher/masquer le configurateur
function toggleBoxConfigurator() {
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

boxCheckbox.addEventListener('change', toggleBoxConfigurator);
boxQtyInput.addEventListener('input', toggleBoxConfigurator);

// Réinitialiser les saveurs
function resetBoxFlavors() {
    flavorInputs.forEach(input => input.value = 0);
    updateRemainingSlots();
}

// Calculer les slots restants
function updateRemainingSlots() {
    let total = 0;
    flavorInputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });
    
    const remaining = 4 - total;
    remainingSlots.textContent = remaining;
    
    if (remaining < 0) {
        boxConfigError.style.display = 'block';
        boxConfigError.textContent = `❌ Trop de saveurs sélectionnées ! Retirez ${Math.abs(remaining)} saveur(s).`;
        remainingSlots.style.color = '#ff4444';
    } else if (remaining > 0 && total > 0) {
        boxConfigError.style.display = 'block';
        boxConfigError.style.background = '#fff3cd';
        boxConfigError.style.borderColor = '#ffc107';
        boxConfigError.style.color = '#856404';
        boxConfigError.textContent = `⚠️ Il reste ${remaining} place(s) dans votre box.`;
        remainingSlots.style.color = '#ffc107';
    } else if (total === 4) {
        boxConfigError.style.display = 'none';
        remainingSlots.style.color = '#28a745';
    } else {
        boxConfigError.style.display = 'none';
        remainingSlots.style.color = '#666';
    }
    
    return { total, remaining };
}

// Écouter les changements de quantité
flavorInputs.forEach(input => {
    input.addEventListener('input', updateRemainingSlots);
});

// Fonction pour récupérer la composition de la box
function getBoxComposition() {
    const composition = [];
    flavorInputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            const flavor = input.dataset.flavor;
            composition.push(`${flavor} x${qty}`);
        }
    });
    return composition.join(', ');
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
    'box-decouverte': 20.00
};

// Frais de livraison par zone
const deliveryFees = {
    'sud': 0,
    'ouest': 3,
    'nord': 5,
    'est': 5
};

document.addEventListener('DOMContentLoaded', () => {
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
            // Forcer l'affichage du configurateur pour la Box Découverte
            if (checkbox.id === 'boxDecouverteCheckbox') {
                setTimeout(() => {
                    toggleBoxConfigurator();
                    console.log('Configurator toggled after checkbox change:', boxCheckbox.checked, boxQtyInput.value);
                }, 50);
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
            // Forcer l'affichage du configurateur pour la Box Découverte
            if (qtyInput.id === 'boxDecouverteQty') {
                setTimeout(() => {
                    toggleBoxConfigurator();
                    console.log('Configurator toggled after qty change:', boxCheckbox.checked, boxQtyInput.value);
                }, 50);
            }
            updateOrderSummary();
        });
        
        qtyInput.addEventListener('input', () => {
            if (parseInt(qtyInput.value) < 0) {
                qtyInput.value = '0';
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
                
                // Vérifier que la composition est valide (4 saveurs)
                const { total } = updateRemainingSlots();
                if (total !== 4) {
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
const BACKEND_URL = 'https://cinnadmoun.onrender.com'; // URL du backend

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
    
    // MODE TEST : Montant à 0€ pour tester sans payer
    const depositAmount = 50; // 0.50€ minimum Stripe (50 centimes)
    
    // Désactiver le bouton pendant le traitement
    const btn = document.getElementById('stripePaymentBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Préparation du paiement...';
    
    try {
        // Appel au backend pour créer la session Stripe
        const response = await fetch(`${BACKEND_URL}/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: depositAmount,
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
                successUrl: window.location.origin + '/success.html',
                cancelUrl: window.location.origin + '/index.html#commander'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors de la création de la session');
        }

        const { sessionId, url } = await response.json();
        
        console.log('✅ Session créée:', sessionId);
        
        // Redirection vers Stripe Checkout
        window.location.href = url;
        
    } catch (error) {
        console.error('❌ Erreur paiement:', error);
        
        // Réactiver le bouton
        btn.disabled = false;
        btn.innerHTML = originalText;
        
        alert(
            '❌ Erreur de paiement\n\n' +
            error.message + '\n\n' +
            'Vérifiez que le serveur backend est démarré.\n' +
            'Commande: cd backend && npm start'
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
            const price = productPrices[checkboxName] || 0;
            const lineTotal = price * quantity;
            
            subtotal += lineTotal;
            products.push({
                name: productName,
                option: optionLabel,
                quantity: quantity,
                unitPrice: price,
                total: lineTotal
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
function showModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
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
// Footer Info Sliding Panel
// ===========================
const footerMain = document.getElementById('footerMain');
const footerInfoPanel = document.getElementById('footerInfoPanel');
const footerInfoContentEl = document.getElementById('footerInfoContent');

// Contenu des différentes sections
const footerInfoData = {
    'zones-livraison': {
        title: 'Zones de Livraison',
        content: `
            <h3>🚚 Nous livrons dans toute La Réunion</h3>
            <div class="info-grid">
                <div class="info-card">
                    <h4>Zone Sud - GRATUIT ✨</h4>
                    <p>Saint-Pierre, Le Tampon, Saint-Joseph</p>
                    <p style="color: var(--secondary-color); font-weight: 600; margin-top: 0.5rem;">Livraison offerte</p>
                </div>
                <div class="info-card">
                    <h4>Zone Ouest</h4>
                    <p>Saint-Paul, Saint-Leu, Le Port</p>
                    <p style="color: var(--secondary-color); font-weight: 600; margin-top: 0.5rem;">+ 3€ de supplément</p>
                </div>
                <div class="info-card">
                    <h4>Zone Nord</h4>
                    <p>Saint-Denis, Sainte-Marie, Sainte-Suzanne</p>
                    <p style="color: var(--secondary-color); font-weight: 600; margin-top: 0.5rem;">+ 5€ de supplément</p>
                </div>
                <div class="info-card">
                    <h4>Zone Est</h4>
                    <p>Saint-Benoît, Saint-André, Bras-Panon</p>
                    <p style="color: var(--secondary-color); font-weight: 600; margin-top: 0.5rem;">+ 5€ de supplément</p>
                </div>
            </div>
            <p><strong>Important :</strong> Commande minimum de 25€ requise pour toutes les livraisons.</p>
        `
    },
    'frais-livraison': {
        title: 'Frais de Livraison',
        content: `
            <h3>💰 Tarifs de Livraison</h3>
            <p><strong>Commande minimum : 25€</strong></p>
            <h3>📍 Selon votre zone :</h3>
            <ul>
                <li><strong>Saint-Pierre / Le Tampon / Saint-Joseph :</strong> Livraison GRATUITE ✨</li>
                <li><strong>Zone Ouest</strong> (Saint-Paul, Saint-Leu, Le Port) : +3€</li>
                <li><strong>Zone Nord</strong> (Saint-Denis, Sainte-Marie, Sainte-Suzanne) : +5€</li>
                <li><strong>Zone Est</strong> (Saint-Benoît, Saint-André, Bras-Panon) : +5€</li>
            </ul>
            <p>Les frais de livraison sont calculés selon votre adresse et ajoutés au montant de votre commande.</p>
        `
    },
    'delais': {
        title: 'Délais de Livraison',
        content: `
            <h3>⏰ Quand recevoir votre commande ?</h3>
            <p><strong style="color: var(--secondary-color); font-size: 1.1rem;">⚠️ Commandez 48h à l'avance</strong></p>
            <ul>
                <li>Délai minimum de 48h requis pour toute commande</li>
                <li>Livraison du mardi au samedi entre 8h et 18h</li>
                <li>Livraison le dimanche entre 8h et 13h (sur demande)</li>
                <li>Créneaux horaires précis communiqués lors de la confirmation</li>
            </ul>
            <p><strong>Important :</strong> Nos cinnamon rolls sont préparés le jour même de la livraison pour garantir une fraîcheur optimale.</p>
        `
    },
    'paiement': {
        title: 'Modes de Paiement',
        content: `
            <h3>💳 Paiements Acceptés</h3>
            <ul>
                <li>Carte bancaire (Visa, Mastercard)</li>
                <li>Paiement mobile (Apple Pay, Google Pay)</li>
                <li>Espèces à la livraison</li>
                <li>Chèques (sur demande)</li>
            </ul>
            <p>Le paiement est effectué au moment de la livraison.</p>
        `
    },
    'securite': {
        title: 'Sécurité',
        content: `
            <h3>🔒 Vos Données sont Protégées</h3>
            <ul>
                <li>Site sécurisé avec certificat SSL</li>
                <li>Aucune donnée bancaire conservée</li>
                <li>Transactions cryptées</li>
                <li>Conformité RGPD</li>
            </ul>
            <p>Nous prenons la sécurité de vos informations très au sérieux.</p>
        `
    },
    'suivi': {
        title: 'Suivi de Commande',
        content: `
            <h3>📦 Suivez votre Commande</h3>
            <p>Après validation de votre commande, vous recevrez :</p>
            <ul>
                <li>Un email de confirmation immédiat</li>
                <li>Un SMS la veille de la livraison</li>
                <li>Un appel 30 minutes avant la livraison</li>
            </ul>
            <p>Pour toute question sur votre commande, contactez-nous au +262 692 37 72 43</p>
        `
    },
    'faq': {
        title: 'Questions Fréquentes',
        content: `
            <h3>❓ FAQ</h3>
            <h4>Puis-je commander pour le jour même ?</h4>
            <p>Non, nous demandons un minimum de 48h pour préparer vos cinnamon rolls frais.</p>
            
            <h4>Combien de temps se conservent les cinnamon rolls ?</h4>
            <p>Nos produits se conservent 2-3 jours à température ambiante dans leur emballage, ou 5-7 jours au réfrigérateur.</p>
            
            <h4>Faites-vous des commandes personnalisées ?</h4>
            <p>Oui ! Contactez-nous pour des créations sur-mesure (événements, entreprises, etc.)</p>
            
            <h4>Y a-t-il des allergènes ?</h4>
            <p>Nos produits contiennent du gluten, des œufs et des produits laitiers. Contactez-nous pour plus de détails.</p>
        `
    },
    'mentions': {
        title: 'Mentions Légales',
        content: `
            <h3>📄 Mentions Légales</h3>
            <h4>Éditeur du Site</h4>
            <p>Cinnad'moun<br>La Réunion, 974<br>Email: contact@cinnadmoun.re</p>
            
            <h4>Hébergement</h4>
            <p>Ce site est hébergé conformément aux normes en vigueur.</p>
            
            <h4>Propriété Intellectuelle</h4>
            <p>Tous les contenus présents sur ce site (textes, images, logos) sont la propriété exclusive de Cinnad'moun.</p>
        `
    },
    'cgv': {
        title: 'Conditions Générales de Vente',
        content: `
            <h3>📋 CGV</h3>
            <h4>Article 1 - Commandes</h4>
            <p>Toute commande doit être passée 48h minimum avant la date de retrait/livraison souhaitée.</p>
            
            <h4>Article 2 - Prix</h4>
            <p>Les prix sont indiqués en euros TTC. Ils peuvent être modifiés à tout moment sans préavis.</p>
            
            <h4>Article 3 - Paiement</h4>
            <p>Le paiement s'effectue au moment du retrait ou de la livraison.</p>
            
            <h4>Article 4 - Annulation</h4>
            <p>Toute annulation doit être effectuée au moins 24h avant la date prévue. Passé ce délai, la commande sera facturée à 50%.</p>
            
            <h4>Article 5 - Réclamations</h4>
            <p>Pour toute réclamation, contactez-nous dans les 48h suivant la réception de votre commande.</p>
        `
    }
};

// Liens footer avec data-info
document.querySelectorAll('[data-info]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const infoType = link.getAttribute('data-info');
        const content = footerInfoData[infoType];
        
        if (content) {
            footerInfoContentEl.innerHTML = `
                <h2>${content.title}</h2>
                ${content.content}
            `;
            footerMain.classList.add('slide-out');
            footerInfoPanel.classList.add('active');
        }
    });
});

// Fonction pour fermer le panel et revenir au footer principal
function closeFooterInfo() {
    footerMain.classList.remove('slide-out');
    footerInfoPanel.classList.remove('active');
}

// Fermer avec la touche Échap
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && footerInfoPanel.classList.contains('active')) {
        closeFooterInfo();
    }
});

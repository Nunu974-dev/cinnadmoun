require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Resend pour l'envoi d'emails
const resend = new Resend(process.env.RESEND_API_KEY || 're_cpsrDLvY_Pc3euk9FATXwEtxxMp2r5Hzw');

// Middleware CORS (toujours en premier)
app.use(cors({
    origin: ['https://cinnadmoun.re', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ⚠️ IMPORTANT: Route webhook AVANT express.json()
// Stripe a besoin du body RAW pour vérifier la signature
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET non défini !');
        return res.status(500).send('Webhook secret non configuré');
    }
    
    let event;
    
    try {
        // Vérification de la signature avec le body RAW
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log('✅ Webhook vérifié:', event.type);
    } catch (err) {
        console.error('❌ Erreur vérification webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Traitement de l'événement
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log('🎉 Paiement réussi:', session.id);
                
                // Récupération des métadonnées
                const metadata = session.metadata;
                const customerEmail = session.customer_details?.email;
                const depositAmount = (session.amount_total / 100).toFixed(2);
                
                console.log('📧 Envoi emails pour:', customerEmail);
                console.log('📦 Métadonnées brutes:', metadata);
                
                // Parser les données de commande depuis metadata
                let orderDetails = {};
                let customerInfo = {};
                
                try {
                    // Stripe stocke les objets en JSON string dans metadata
                    if (metadata.orderDetails) {
                        orderDetails = JSON.parse(metadata.orderDetails);
                    }
                    if (metadata.customerInfo) {
                        customerInfo = JSON.parse(metadata.customerInfo);
                    }
                    console.log('📦 orderDetails parsé:', orderDetails);
                    console.log('👤 customerInfo parsé:', customerInfo);
                } catch (parseError) {
                    console.error('❌ Erreur parsing metadata:', parseError);
                    // Fallback sur metadata direct
                    customerInfo = {
                        firstName: metadata.firstName || '',
                        lastName: metadata.lastName || '',
                        email: customerEmail,
                        phone: metadata.phone || '',
                        pickupPoint: metadata.pickupPoint || '',
                        city: metadata.city || '',
                        deliveryDate: metadata.deliveryDate || '',
                        message: metadata.message || ''
                    };
                    orderDetails = {
                        products: [],
                        productSummary: metadata.productSummary || metadata.orderSummary || '',
                        subtotal: parseFloat(metadata.subtotal || 0),
                        deliveryFee: parseFloat(metadata.deliveryFee || 0),
                        total: parseFloat(metadata.total || 0),
                        deposit: parseFloat(depositAmount),
                        balance: parseFloat(metadata.balance || 0)
                    };
                }
                
                const customerName = `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Client';
                
                // Email au client avec le BEAU TEMPLATE
                if (customerEmail) {
                    try {
                        await resend.emails.send({
                            from: 'Cinnad\'moun <commandes@cinnadmoun.re>',
                            to: customerEmail,
                            subject: '✅ Confirmation de votre commande Cinnad\'moun',
                            html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta charset="UTF-8">
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                </head>
                                <body style="margin: 0; padding: 0; background-color: #f9f6f1; font-family: 'Georgia', serif;">
                                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                                        <!-- Header avec logo -->
                                        <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); padding: 40px 20px; text-align: center;">
                                            <img src="https://cinnadmoun.re/img/Logo.png" alt="Cinnad'moun" style="max-width: 150px; height: auto; margin-bottom: 15px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">Merci pour votre commande !</h1>
                                        </div>
                                        
                                        <!-- Contenu principal -->
                                        <div style="padding: 40px 30px;">
                                            <p style="font-size: 16px; color: #5D4037; line-height: 1.6; margin-bottom: 20px;">
                                                Bonjour <strong>${customerName}</strong>,
                                            </p>
                                            
                                            <p style="font-size: 15px; color: #5D4037; line-height: 1.6; margin-bottom: 30px;">
                                                Votre commande a bien été enregistrée et le paiement de <strong>${depositAmount}€</strong> (acompte 30%) a été confirmé ! 🎉<br>
                                                Nos artisans pâtissiers préparent avec soin vos délicieux cinnamon rolls. 🥐
                                            </p>
                                            
                                            <!-- Informations client -->
                                            <div style="background: #FFF8E1; border-left: 4px solid #D4A574; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
                                                <h3 style="color: #8B4513; margin: 0 0 15px 0; font-size: 18px;">📍 Vos informations</h3>
                                                <table style="width: 100%; border-collapse: collapse;">
                                                    <tr>
                                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;"><strong>Email :</strong></td>
                                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;">${customerEmail}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;"><strong>Téléphone :</strong></td>
                                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;">${customerInfo.phone || 'N/A'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;"><strong>Point de retrait :</strong></td>
                                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;">${customerInfo.pickupPoint || 'N/A'}</td>
                                                    </tr>
                                                    ${customerInfo.deliveryDate ? `
                                                    <tr>
                                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;"><strong>Date de retrait :</strong></td>
                                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;">${customerInfo.deliveryDate}</td>
                                                    </tr>` : ''}
                                                </table>
                                            </div>
                                            
                                            <!-- Produits commandés -->
                                            <div style="margin-bottom: 25px;">
                                                <h3 style="color: #8B4513; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #D4A574; padding-bottom: 10px;">🥐 Vos créations artisanales</h3>
                                                ${orderDetails.products && orderDetails.products.length > 0 ? orderDetails.products.map(item => `
                                                    <div style="background: #FAFAFA; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #E0E0E0;">
                                                        <p style="margin: 0 0 8px 0; color: #8B4513; font-size: 16px; font-weight: bold;">${item.name}</p>
                                                        <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">${item.option}</p>
                                                        <p style="margin: 5px 0; color: #5D4037; font-size: 14px;">
                                                            <span style="color: #999;">Quantité :</span> ${item.quantity} × ${item.unitPrice.toFixed(2)}€ = 
                                                            <strong style="color: #8B4513;">${item.total.toFixed(2)}€</strong>
                                                        </p>
                                                        ${item.composition ? `
                                                        <div style="margin-top: 10px; padding: 10px; background: #FFF3E0; border-left: 3px solid #FF9800; border-radius: 4px;">
                                                            <p style="margin: 0; font-size: 13px; color: #E65100;">
                                                                <strong>📦 Composition personnalisée :</strong> ${item.composition}
                                                            </p>
                                                        </div>` : ''}
                                                    </div>
                                                `).join('') : `<p style="color: #5D4037;">${orderDetails.productSummary || 'Produits commandés'}</p>`}
                                            </div>
                                            
                                            <!-- Récapitulatif prix -->
                                            <div style="background: #F5F5F5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                                <table style="width: 100%; border-collapse: collapse;">
                                                    <tr>
                                                        <td style="padding: 8px 0; color: #5D4037; font-size: 15px;">Sous-total produits :</td>
                                                        <td style="padding: 8px 0; color: #5D4037; font-size: 15px; text-align: right;">${(orderDetails.subtotal || 0).toFixed(2)}€</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 8px 0; color: #5D4037; font-size: 15px;">Frais de livraison :</td>
                                                        <td style="padding: 8px 0; color: #5D4037; font-size: 15px; text-align: right;">${orderDetails.deliveryFee === 0 ? '<span style="color: #4CAF50;">GRATUIT ✨</span>' : (orderDetails.deliveryFee || 0).toFixed(2) + '€'}</td>
                                                    </tr>
                                                    <tr style="border-top: 2px solid #D4A574;">
                                                        <td style="padding: 12px 0 0 0; color: #8B4513; font-size: 18px; font-weight: bold;">TOTAL COMMANDE :</td>
                                                        <td style="padding: 12px 0 0 0; color: #8B4513; font-size: 20px; font-weight: bold; text-align: right;">${(orderDetails.total || 0).toFixed(2)}€</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 8px 0; color: #4CAF50; font-size: 15px;">✅ Acompte payé (30%) :</td>
                                                        <td style="padding: 8px 0; color: #4CAF50; font-size: 15px; text-align: right;">${depositAmount}€</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 8px 0; color: #E65100; font-size: 15px; font-weight: bold;">💰 Solde à régler au retrait :</td>
                                                        <td style="padding: 8px 0; color: #E65100; font-size: 15px; font-weight: bold; text-align: right;">${(orderDetails.balance || 0).toFixed(2)}€</td>
                                                    </tr>
                                                </table>
                                            </div>
                                            
                                            ${customerInfo.message ? `
                                            <div style="background: #E8F5E9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50; margin-bottom: 25px;">
                                                <p style="margin: 0; color: #2E7D32; font-size: 14px;"><strong>💬 Votre message :</strong></p>
                                                <p style="margin: 5px 0 0 0; color: #5D4037; font-size: 14px;">${customerInfo.message}</p>
                                            </div>` : ''}
                                            
                                            <!-- Instructions -->
                                            <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                                <h3 style="color: #1565C0; margin: 0 0 12px 0; font-size: 16px;">📋 Prochaines étapes</h3>
                                                <ul style="margin: 0; padding-left: 20px; color: #5D4037; font-size: 14px; line-height: 1.8;">
                                                    <li>Nous vous recontacterons par SMS/email pour confirmer la date et l'heure de retrait</li>
                                                    <li>Préparez le solde de <strong>${(orderDetails.balance || 0).toFixed(2)}€</strong> en espèces pour le retrait</li>
                                                    <li>Conservez cet email comme preuve de commande</li>
                                                </ul>
                                            </div>
                                            
                                            <p style="font-size: 15px; color: #5D4037; line-height: 1.6; text-align: center; margin: 30px 0;">
                                                Nous avons hâte de vous faire découvrir nos créations ! 🌟
                                            </p>
                                        </div>
                                        
                                        <!-- Footer -->
                                        <div style="background: #3E2723; padding: 30px 20px; text-align: center;">
                                            <p style="color: #D4A574; font-size: 18px; margin: 0 0 10px 0; font-weight: bold;">L'équipe Cinnad'moun</p>
                                            <p style="color: #BCAAA4; font-size: 13px; margin: 0 0 15px 0;">Les meilleurs cinnamon rolls de La Réunion 🌺</p>
                                            <p style="color: #BCAAA4; font-size: 12px; margin: 5px 0;">
                                                📧 <a href="mailto:contact@cinnadmoun.re" style="color: #D4A574; text-decoration: none;">contact@cinnadmoun.re</a>
                                            </p>
                                            <p style="color: #BCAAA4; font-size: 12px; margin: 5px 0;">
                                                📱 +262 692 37 72 43
                                            </p>
                                            <p style="color: #8D6E63; font-size: 11px; margin: 20px 0 0 0;">
                                                © 2025 Cinnad'moun - Tous droits réservés
                                            </p>
                                        </div>
                                    </div>
                                </body>
                                </html>
                            `
                        });
                        console.log('✅ Email client envoyé à:', customerEmail);
                    } catch (emailError) {
                        console.error('❌ Erreur email client:', emailError);
                    }
                }
                
                // Email au commerçant (vous gardez le simple)
                try {
                    await resend.emails.send({
                        from: 'Cinnad\'moun <commandes@cinnadmoun.re>',
                        to: 'commandes@cinnadmoun.re',
                        subject: '🔔 Nouvelle commande - ' + customerName,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h1 style="color: #8B4513;">Nouvelle commande reçue ! 🎉</h1>
                                
                                <h2>Informations client</h2>
                                <ul>
                                    <li><strong>Nom:</strong> ${customerName}</li>
                                    <li><strong>Email:</strong> ${customerEmail}</li>
                                    <li><strong>Téléphone:</strong> ${customerInfo.phone || 'N/A'}</li>
                                    <li><strong>Point de retrait:</strong> ${customerInfo.pickupPoint || 'N/A'}</li>
                                    <li><strong>Date souhaitée:</strong> ${customerInfo.deliveryDate || 'N/A'}</li>
                                </ul>
                                
                                <h2>Détails de la commande</h2>
                                ${orderDetails.products && orderDetails.products.length > 0 ? 
                                    orderDetails.products.map(item => `
                                        <div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px;">
                                            <strong>${item.name}</strong> - ${item.option}<br>
                                            Quantité: ${item.quantity} × ${item.unitPrice.toFixed(2)}€ = <strong>${item.total.toFixed(2)}€</strong>
                                            ${item.composition ? `<br><em>🎨 Composition: ${item.composition}</em>` : ''}
                                        </div>
                                    `).join('') 
                                    : `<p>${orderDetails.productSummary}</p>`}
                                
                                <h2>Récapitulatif</h2>
                                <ul>
                                    <li>Sous-total: ${(orderDetails.subtotal || 0).toFixed(2)}€</li>
                                    <li>Livraison: ${(orderDetails.deliveryFee || 0).toFixed(2)}€</li>
                                    <li><strong>Total: ${(orderDetails.total || 0).toFixed(2)}€</strong></li>
                                    <li style="color: #4CAF50;">✅ Acompte payé: ${depositAmount}€</li>
                                    <li style="color: #E65100;"><strong>💰 Solde à encaisser: ${(orderDetails.balance || 0).toFixed(2)}€</strong></li>
                                </ul>
                                
                                ${customerInfo.message ? `
                                <div style="background: #E8F5E9; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                    <strong>💬 Message du client:</strong><br>
                                    ${customerInfo.message}
                                </div>` : ''}
                                
                                <p style="margin-top: 30px; padding: 15px; background: #f0f0f0; border-radius: 5px;">
                                    <strong>ID Session Stripe:</strong> ${session.id}<br>
                                    <strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}
                                </p>
                            </div>
                        `
                    });
                    console.log('✅ Email commerçant envoyé');
                } catch (emailError) {
                    console.error('❌ Erreur email commerçant:', emailError);
                }
                
                break;
            
            default:
                console.log('ℹ️ Événement non géré:', event.type);
        }
        
        res.json({ received: true });
    } catch (err) {
        console.error('❌ Erreur traitement webhook:', err);
        res.status(500).json({ error: 'Erreur traitement' });
    }
});

// Maintenant on peut parser JSON pour les autres routes
app.use(express.json());

// Route de test
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Backend Cinnad\'moun opérationnel ✅',
        timestamp: new Date().toISOString()
    });
});

// Route pour créer une session de paiement Stripe
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { 
            amount, 
            customerInfo, 
            orderDetails,
            successUrl,
            cancelUrl 
        } = req.body;

        // Validation
        if (!amount || amount < 50) { // Minimum 0.50€ (50 centimes)
            return res.status(400).json({ 
                error: 'Montant invalide. Minimum 0,50€' 
            });
        }

        // Créer la session Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Commande Cinnad'moun - Acompte 20%`,
                            description: `${orderDetails.productSummary || 'Cinnamon rolls artisanaux'}`,
                            images: ['https://via.placeholder.com/300x300.png?text=Cinnadmoun'], // Remplacer par votre logo
                        },
                        unit_amount: amount, // En centimes
                    },
                    quantity: 1,
                },
            ],
            customer_email: customerInfo.email,
            metadata: {
                // Stocker les objets complets en JSON pour le webhook
                customerInfo: JSON.stringify(customerInfo),
                orderDetails: JSON.stringify(orderDetails),
                // Aussi en format plat pour visualisation dans Stripe Dashboard
                customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
                phone: customerInfo.phone,
                pickupPoint: customerInfo.pickupPoint,
                zone: customerInfo.zone,
                deliveryDate: customerInfo.deliveryDate || '',
                orderTotal: orderDetails.total.toString(),
                depositAmount: orderDetails.deposit.toString(),
                balanceAmount: orderDetails.balance.toString(),
                productSummary: orderDetails.productSummary
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        console.log(`✅ Session créée pour ${customerInfo.email} - ${amount/100}€`);

        res.json({ 
            sessionId: session.id,
            url: session.url 
        });

    } catch (error) {
        console.error('❌ Erreur création session:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la création de la session de paiement',
            details: error.message 
        });
    }
});

// Route pour envoyer la commande par email (sans paiement - mode test)
app.post('/send-order-email', async (req, res) => {
    try {
        const { customerInfo, orderDetails } = req.body;

        // Validation
        if (!customerInfo || !orderDetails) {
            return res.status(400).json({ 
                error: 'Données manquantes' 
            });
        }

        const customerName = `${customerInfo.firstName} ${customerInfo.lastName}`;
        const customerEmail = customerInfo.email;

        // Email au client
        await resend.emails.send({
            from: 'Cinnad\'moun <commandes@cinnadmoun.re>',
            to: customerEmail,
            subject: '✅ Confirmation de votre commande Cinnad\'moun',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f9f6f1; font-family: 'Georgia', serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                        <!-- Header avec logo -->
                        <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); padding: 40px 20px; text-align: center;">
                            <img src="https://cinnadmoun.re/img/Logo.png" alt="Cinnad'moun" style="max-width: 150px; height: auto; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">Merci pour votre commande !</h1>
                        </div>
                        
                        <!-- Contenu principal -->
                        <div style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #5D4037; line-height: 1.6; margin-bottom: 20px;">
                                Bonjour <strong>${customerName}</strong>,
                            </p>
                            
                            <p style="font-size: 15px; color: #5D4037; line-height: 1.6; margin-bottom: 30px;">
                                Votre commande a bien été enregistrée ! Nos artisans pâtissiers préparent avec soin vos délicieux cinnamon rolls. 🥐
                            </p>
                            
                            <!-- Informations client -->
                            <div style="background: #FFF8E1; border-left: 4px solid #D4A574; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
                                <h3 style="color: #8B4513; margin: 0 0 15px 0; font-size: 18px;">📍 Vos informations</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;"><strong>Email :</strong></td>
                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;">${customerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;"><strong>Téléphone :</strong></td>
                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;">${customerInfo.phone}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;"><strong>Point de retrait :</strong></td>
                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;">${customerInfo.pickupPoint}</td>
                                    </tr>
                                    ${customerInfo.deliveryDate ? `
                                    <tr>
                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;"><strong>Date de retrait :</strong></td>
                                        <td style="padding: 5px 0; color: #5D4037; font-size: 14px;">${customerInfo.deliveryDate}</td>
                                    </tr>` : ''}
                                </table>
                            </div>
                            
                            <!-- Produits commandés -->
                            <div style="margin-bottom: 25px;">
                                <h3 style="color: #8B4513; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #D4A574; padding-bottom: 10px;">🥐 Vos créations artisanales</h3>
                                ${orderDetails.products ? orderDetails.products.map(item => `
                                    <div style="background: #FAFAFA; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #E0E0E0;">
                                        <p style="margin: 0 0 8px 0; color: #8B4513; font-size: 16px; font-weight: bold;">${item.name}</p>
                                        <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">${item.option}</p>
                                        <p style="margin: 5px 0; color: #5D4037; font-size: 14px;">
                                            <span style="color: #999;">Quantité :</span> ${item.quantity} × ${item.unitPrice.toFixed(2)}€ = 
                                            <strong style="color: #8B4513;">${item.total.toFixed(2)}€</strong>
                                        </p>
                                        ${item.composition ? `
                                        <div style="margin-top: 10px; padding: 10px; background: #FFF3E0; border-left: 3px solid #FF9800; border-radius: 4px;">
                                            <p style="margin: 0; font-size: 13px; color: #E65100;">
                                                <strong>📦 Composition personnalisée :</strong> ${item.composition}
                                            </p>
                                        </div>` : ''}
                                    </div>
                                `).join('') : `<p style="color: #5D4037;">${orderDetails.productSummary}</p>`}
                            </div>
                            
                            <!-- Récapitulatif prix -->
                            <div style="background: #F5F5F5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #5D4037; font-size: 15px;">Sous-total produits :</td>
                                        <td style="padding: 8px 0; color: #5D4037; font-size: 15px; text-align: right;">${orderDetails.subtotal.toFixed(2)}€</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #5D4037; font-size: 15px;">Frais de livraison :</td>
                                        <td style="padding: 8px 0; color: #5D4037; font-size: 15px; text-align: right;">${orderDetails.deliveryFee === 0 ? '<span style="color: #4CAF50;">GRATUIT ✨</span>' : orderDetails.deliveryFee.toFixed(2) + '€'}</td>
                                    </tr>
                                    <tr style="border-top: 2px solid #D4A574;">
                                        <td style="padding: 12px 0 0 0; color: #8B4513; font-size: 18px; font-weight: bold;">TOTAL :</td>
                                        <td style="padding: 12px 0 0 0; color: #8B4513; font-size: 20px; font-weight: bold; text-align: right;">${orderDetails.total.toFixed(2)}€</td>
                                    </tr>
                                </table>
                                <p style="margin: 15px 0 0 0; padding: 12px; background: #FFF3E0; border-radius: 4px; color: #E65100; font-size: 13px; text-align: center;">
                                    💰 <strong>Paiement à effectuer au retrait</strong>
                                </p>
                            </div>
                            
                            ${customerInfo.message ? `
                            <div style="background: #E8F5E9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50; margin-bottom: 25px;">
                                <p style="margin: 0; color: #2E7D32; font-size: 14px;"><strong>💬 Votre message :</strong></p>
                                <p style="margin: 5px 0 0 0; color: #5D4037; font-size: 14px;">${customerInfo.message}</p>
                            </div>` : ''}
                            
                            <!-- Instructions -->
                            <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <h3 style="color: #1565C0; margin: 0 0 12px 0; font-size: 16px;">📋 Prochaines étapes</h3>
                                <ul style="margin: 0; padding-left: 20px; color: #5D4037; font-size: 14px; line-height: 1.8;">
                                    <li>Nous vous recontacterons par SMS/email pour confirmer la date et l'heure de retrait</li>
                                    <li>Préparez le montant exact en espèces pour faciliter le retrait</li>
                                    <li>Conservez cet email comme preuve de commande</li>
                                </ul>
                            </div>
                            
                            <p style="font-size: 15px; color: #5D4037; line-height: 1.6; text-align: center; margin: 30px 0;">
                                Nous avons hâte de vous faire découvrir nos créations ! 🌟
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #3E2723; padding: 30px 20px; text-align: center;">
                            <p style="color: #D4A574; font-size: 18px; margin: 0 0 10px 0; font-weight: bold;">L'équipe Cinnad'moun</p>
                            <p style="color: #BCAAA4; font-size: 13px; margin: 0 0 15px 0;">Les meilleurs cinnamon rolls de La Réunion 🌺</p>
                            <p style="color: #BCAAA4; font-size: 12px; margin: 5px 0;">
                                📧 <a href="mailto:contact@cinnadmoun.re" style="color: #D4A574; text-decoration: none;">contact@cinnadmoun.re</a>
                            </p>
                            <p style="color: #BCAAA4; font-size: 12px; margin: 5px 0;">
                                📱 +262 692 37 72 43
                            </p>
                            <p style="color: #8D6E63; font-size: 11px; margin: 20px 0 0 0;">
                                © 2025 Cinnad'moun - Tous droits réservés
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        // Email au commerçant
        await resend.emails.send({
            from: 'Cinnad\'moun <commandes@cinnadmoun.re>',
            to: 'contact@cinnadmoun.re',
            subject: `🔔 Nouvelle commande - ${customerName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
                    <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff;">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%); padding: 30px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 26px;">🎉 NOUVELLE COMMANDE !</h1>
                            <p style="color: #E8F5E9; margin: 10px 0 0 0; font-size: 14px;">Commande reçue le ${new Date().toLocaleString('fr-FR')}</p>
                        </div>
                        
                        <!-- Contenu -->
                        <div style="padding: 30px;">
                            <!-- Info client -->
                            <div style="background: #E8F5E9; border-left: 5px solid #4CAF50; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
                                <h2 style="color: #2E7D32; margin: 0 0 15px 0; font-size: 20px;">👤 Informations client</h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px; font-weight: bold;">Nom :</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px;">${customerName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px; font-weight: bold;">Email :</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px;"><a href="mailto:${customerEmail}" style="color: #1976D2; text-decoration: none;">${customerEmail}</a></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px; font-weight: bold;">Téléphone :</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px;"><a href="tel:${customerInfo.phone}" style="color: #1976D2; text-decoration: none;">${customerInfo.phone}</a></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px; font-weight: bold;">Point de retrait :</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px;">${customerInfo.pickupPoint}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px; font-weight: bold;">Zone :</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px;"><span style="background: #FFF3E0; padding: 4px 12px; border-radius: 12px; color: #E65100; font-weight: bold;">${customerInfo.zone.toUpperCase()}</span></td>
                                    </tr>
                                    ${customerInfo.deliveryDate ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #333; font-size: 15px; font-weight: bold;">Date de retrait :</td>
                                        <td style="padding: 8px 0; color: #D32F2F; font-size: 16px; font-weight: bold;">📅 ${customerInfo.deliveryDate}</td>
                                    </tr>` : ''}
                                </table>
                            </div>
                            
                            <!-- Produits commandés -->
                            <div style="margin-bottom: 25px;">
                                <h2 style="color: #8B4513; margin: 0 0 15px 0; font-size: 20px; border-bottom: 3px solid #D4A574; padding-bottom: 10px;">📦 Détails de la commande</h2>
                                ${orderDetails.products ? orderDetails.products.map(item => `
                                    <div style="background: #FAFAFA; padding: 18px; margin: 12px 0; border-radius: 8px; border: 2px solid #E0E0E0;">
                                        <div style="display: flex; justify-content: space-between; align-items: start;">
                                            <div style="flex: 1;">
                                                <p style="margin: 0 0 5px 0; color: #8B4513; font-size: 18px; font-weight: bold;">${item.name}</p>
                                                <p style="margin: 0 0 8px 0; color: #666; font-size: 15px;">${item.option}</p>
                                                <p style="margin: 0; color: #333; font-size: 15px;">
                                                    Quantité : <strong style="color: #2E7D32;">${item.quantity}</strong> × ${item.unitPrice.toFixed(2)}€
                                                </p>
                                            </div>
                                            <div style="text-align: right;">
                                                <p style="margin: 0; font-size: 22px; color: #8B4513; font-weight: bold;">${item.total.toFixed(2)}€</p>
                                            </div>
                                        </div>
                                        ${item.composition ? `
                                        <div style="margin-top: 12px; padding: 12px; background: #FFF3E0; border-left: 4px solid #FF9800; border-radius: 4px;">
                                            <p style="margin: 0; font-size: 14px; color: #E65100;">
                                                <strong>📦 COMPOSITION PERSONNALISÉE :</strong><br>
                                                <span style="font-size: 16px; color: #333; margin-top: 5px; display: block;">${item.composition}</span>
                                            </p>
                                        </div>` : ''}
                                    </div>
                                `).join('') : `<p style="color: #333;">${orderDetails.productSummary}</p>`}
                            </div>
                            
                            <!-- Totaux -->
                            <div style="background: #FFF9C4; padding: 25px; border-radius: 8px; border: 2px solid #FBC02D; margin-bottom: 25px;">
                                <h2 style="color: #F57F17; margin: 0 0 15px 0; font-size: 20px;">💰 Montants</h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px 0; color: #333; font-size: 16px;">Sous-total produits :</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 16px; text-align: right; font-weight: bold;">${orderDetails.subtotal.toFixed(2)}€</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #333; font-size: 16px;">Frais de livraison :</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 16px; text-align: right; font-weight: bold;">${orderDetails.deliveryFee === 0 ? '<span style="color: #4CAF50;">GRATUIT</span>' : orderDetails.deliveryFee.toFixed(2) + '€'}</td>
                                    </tr>
                                    <tr style="border-top: 3px solid #F57F17;">
                                        <td style="padding: 15px 0 0 0; color: #D84315; font-size: 20px; font-weight: bold;">TOTAL À ENCAISSER :</td>
                                        <td style="padding: 15px 0 0 0; color: #D84315; font-size: 24px; font-weight: bold; text-align: right;">${orderDetails.total.toFixed(2)}€</td>
                                    </tr>
                                </table>
                                <p style="margin: 15px 0 0 0; padding: 15px; background: #FFEBEE; border-radius: 4px; color: #C62828; font-size: 15px; text-align: center; font-weight: bold;">
                                    ⚠️ PAIEMENT NON EFFECTUÉ - À ENCAISSER AU RETRAIT
                                </p>
                            </div>
                            
                            ${customerInfo.message ? `
                            <div style="background: #E1F5FE; padding: 20px; border-radius: 8px; border-left: 5px solid #039BE5; margin-bottom: 25px;">
                                <h3 style="color: #01579B; margin: 0 0 10px 0; font-size: 16px;">💬 Message du client :</h3>
                                <p style="margin: 0; color: #333; font-size: 15px; font-style: italic; line-height: 1.6;">"${customerInfo.message}"</p>
                            </div>` : ''}
                            
                            <!-- Actions -->
                            <div style="text-align: center; margin-top: 30px;">
                                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Pensez à contacter le client pour confirmer la commande</p>
                                <a href="tel:${customerInfo.phone}" style="display: inline-block; background: #4CAF50; color: white; padding: 14px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; margin: 5px;">
                                    📱 Appeler le client
                                </a>
                                <a href="mailto:${customerEmail}" style="display: inline-block; background: #2196F3; color: white; padding: 14px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; margin: 5px;">
                                    📧 Envoyer un email
                                </a>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #3E2723; padding: 20px; text-align: center; color: #BCAAA4; font-size: 12px;">
                            <p style="margin: 5px 0;">Email automatique du système de commande Cinnad'moun</p>
                            <p style="margin: 5px 0;">© 2025 Cinnad'moun - Tous droits réservés</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        console.log('✅ Emails envoyés pour commande sans paiement');
        
        res.json({ 
            success: true,
            message: 'Commande envoyée par email' 
        });

    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'envoi des emails',
            details: error.message 
        });
    }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Une erreur est survenue sur le serveur',
        message: err.message 
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log('🚀 ═══════════════════════════════════════');
    console.log(`🥐 Backend Cinnad'moun démarré`);
    console.log(`📡 Serveur: http://localhost:${PORT}`);
    console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configuré ✅' : 'Non configuré ❌'}`);
    console.log('🚀 ═══════════════════════════════════════');
});

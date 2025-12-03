require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Resend pour l'envoi d'emails
const resend = new Resend(process.env.RESEND_API_KEY || 're_cpsrDLvY_Pc3euk9FATXwEtxxMp2r5Hzw');

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*'
}));
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
                            name: `Commande Cinnad'moun - Acompte 30%`,
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
                customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
                phone: customerInfo.phone,
                pickupPoint: customerInfo.pickupPoint,
                city: customerInfo.city,
                zone: customerInfo.zone,
                deliveryDate: customerInfo.deliveryDate,
                orderTotal: orderDetails.total,
                depositAmount: orderDetails.deposit,
                balanceAmount: orderDetails.balance,
                products: JSON.stringify(orderDetails.products),
                message: customerInfo.message || 'Aucune remarque'
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

// Webhook Stripe (pour recevoir les confirmations de paiement)
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            event = req.body;
        }

        // Gérer les événements
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log('🎉 Paiement réussi:', session.id);
                console.log('Client:', session.customer_email);
                console.log('Montant:', session.amount_total / 100, '€');
                
                // Envoi d'emails de confirmation
                const metadata = session.metadata;
                const customerEmail = session.customer_details?.email || session.customer_email;
                
                // Email au client
                if (customerEmail) {
                    await resend.emails.send({
                        from: 'Cinnad\'moun <onboarding@resend.dev>',
                        to: customerEmail,
                        subject: '✅ Confirmation de votre commande Cinnad\'moun',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h1 style="color: #8B4513;">Merci pour votre commande ! 🥐</h1>
                                <p>Bonjour ${metadata.customerName || 'Client'},</p>
                                <p>Votre paiement a bien été reçu. Voici le récapitulatif de votre commande :</p>
                                
                                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="margin-top: 0;">📦 Détails de la commande</h3>
                                    <p><strong>Email :</strong> ${customerEmail}</p>
                                    <p><strong>Téléphone :</strong> ${metadata.phone || 'Non renseigné'}</p>
                                    <p><strong>Point de retrait :</strong> ${metadata.pickupPoint || metadata.city}</p>
                                    <p><strong>Zone :</strong> ${metadata.zone}</p>
                                    <p><strong>Montant payé (acompte 30%) :</strong> ${(session.amount_total / 100).toFixed(2)}€</p>
                                    <p><strong>Solde à régler à la livraison :</strong> ${metadata.remainingAmount || '0'}€</p>
                                    <p><strong>Total commande :</strong> ${metadata.totalAmount || (session.amount_total / 100).toFixed(2)}€</p>
                                </div>
                                
                                <p><strong>Instructions :</strong></p>
                                <ul>
                                    <li>Vous recevrez un SMS/email pour confirmer la date et l'heure de retrait</li>
                                    <li>Le solde de ${metadata.remainingAmount || '0'}€ sera à régler en espèces lors du retrait</li>
                                    <li>Pensez à apporter votre bon de commande (cet email)</li>
                                </ul>
                                
                                <p style="margin-top: 30px;">À très bientôt ! 🌟</p>
                                <p><strong>L'équipe Cinnad'moun</strong></p>
                                <p style="font-size: 12px; color: #666;">
                                    Contact : <a href="mailto:contact@cinnadmoun.re">contact@cinnadmoun.re</a>
                                </p>
                            </div>
                        `
                    });
                    console.log('✅ Email envoyé au client:', customerEmail);
                }
                
                // Email de notification au marchand
                await resend.emails.send({
                    from: 'Cinnad\'moun <onboarding@resend.dev>',
                    to: 'jchanewai@gmail.com',
                    subject: '🔔 Nouvelle commande reçue !',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #8B4513;">Nouvelle commande 🎉</h1>
                            
                            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin-top: 0;">📋 Informations client</h3>
                                <p><strong>Nom :</strong> ${metadata.customerName || 'Non renseigné'}</p>
                                <p><strong>Email :</strong> ${customerEmail}</p>
                                <p><strong>Téléphone :</strong> ${metadata.phone || 'Non renseigné'}</p>
                                <p><strong>Point de retrait :</strong> ${metadata.pickupPoint || metadata.city}</p>
                                <p><strong>Zone :</strong> ${metadata.zone}</p>
                            </div>
                            
                            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin-top: 0;">💰 Montants</h3>
                                <p><strong>Acompte payé (30%) :</strong> ${(session.amount_total / 100).toFixed(2)}€</p>
                                <p><strong>Solde à encaisser :</strong> ${metadata.remainingAmount || '0'}€</p>
                                <p><strong>Total commande :</strong> ${metadata.totalAmount || (session.amount_total / 100).toFixed(2)}€</p>
                            </div>
                            
                            <p><strong>ID Stripe :</strong> ${session.id}</p>
                            <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                            
                            <p style="margin-top: 30px;">
                                <a href="https://dashboard.stripe.com/payments/${session.payment_intent}" 
                                   style="background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                    Voir dans Stripe
                                </a>
                            </p>
                        </div>
                    `
                });
                console.log('✅ Email de notification envoyé au marchand');
                
                break;

            case 'checkout.session.expired':
                console.log('⏱️ Session expirée:', event.data.object.id);
                break;

            case 'payment_intent.payment_failed':
                console.log('❌ Paiement échoué:', event.data.object.id);
                break;

            default:
                console.log(`Event non géré: ${event.type}`);
        }

        res.json({ received: true });

    } catch (err) {
        console.error('❌ Erreur webhook:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
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
            from: 'Cinnad\'moun <onboarding@resend.dev>',
            to: customerEmail,
            subject: '✅ Confirmation de votre commande Cinnad\'moun',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #8B4513;">Merci pour votre commande ! 🥐</h1>
                    <p>Bonjour ${customerName},</p>
                    <p>Votre commande a bien été enregistrée. Voici le récapitulatif :</p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">📦 Détails de la commande</h3>
                        <p><strong>Email :</strong> ${customerEmail}</p>
                        <p><strong>Téléphone :</strong> ${customerInfo.phone}</p>
                        <p><strong>Point de retrait :</strong> ${customerInfo.pickupPoint}</p>
                        <p><strong>Zone :</strong> ${customerInfo.zone}</p>
                        ${customerInfo.deliveryDate ? `<p><strong>Date de retrait :</strong> ${customerInfo.deliveryDate}</p>` : ''}
                        ${customerInfo.message ? `<p><strong>Message :</strong> ${customerInfo.message}</p>` : ''}
                        
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <p><strong>Produits :</strong> ${orderDetails.productSummary}</p>
                        <p><strong>Sous-total :</strong> ${orderDetails.subtotal.toFixed(2)}€</p>
                        <p><strong>Frais de livraison :</strong> ${orderDetails.deliveryFee.toFixed(2)}€</p>
                        <p style="font-size: 18px; color: #8B4513;"><strong>Total :</strong> ${orderDetails.total.toFixed(2)}€</p>
                        <p style="color: #666; font-size: 14px;">⚠️ Paiement à effectuer au retrait</p>
                    </div>
                    
                    <p>Nous vous recontacterons pour confirmer votre commande.</p>
                    <p>À très bientôt ! 🥐</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">Cinnad'moun - Les meilleurs cinnamons rolls de La Réunion</p>
                </div>
            `
        });

        // Email au commerçant
        await resend.emails.send({
            from: 'Cinnad\'moun <onboarding@resend.dev>',
            to: 'jchanewai@gmail.com',
            subject: `🛒 Nouvelle commande - ${customerName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #8B4513;">Nouvelle commande reçue ! 🛒</h1>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">👤 Informations client</h3>
                        <p><strong>Nom :</strong> ${customerName}</p>
                        <p><strong>Email :</strong> ${customerEmail}</p>
                        <p><strong>Téléphone :</strong> ${customerInfo.phone}</p>
                        <p><strong>Point de retrait :</strong> ${customerInfo.pickupPoint}</p>
                        <p><strong>Zone :</strong> ${customerInfo.zone}</p>
                        ${customerInfo.deliveryDate ? `<p><strong>Date de retrait :</strong> ${customerInfo.deliveryDate}</p>` : ''}
                        ${customerInfo.message ? `<p><strong>Message :</strong> ${customerInfo.message}</p>` : ''}
                        
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <h3>📦 Détails de la commande</h3>
                        <p><strong>Produits :</strong> ${orderDetails.productSummary}</p>
                        <p><strong>Sous-total :</strong> ${orderDetails.subtotal.toFixed(2)}€</p>
                        <p><strong>Frais de livraison :</strong> ${orderDetails.deliveryFee.toFixed(2)}€</p>
                        <p style="font-size: 18px; color: #8B4513;"><strong>TOTAL :</strong> ${orderDetails.total.toFixed(2)}€</p>
                        <p style="color: #d9534f; font-weight: bold;">⚠️ PAIEMENT NON EFFECTUÉ - À encaisser au retrait</p>
                    </div>
                </div>
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

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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
                
                // Ici vous pouvez :
                // - Envoyer un email de confirmation
                // - Enregistrer dans une base de données
                // - Notifier l'équipe
                // - etc.
                
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

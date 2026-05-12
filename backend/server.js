// =============================================
// BACKEND PAIEMENT – PAYTECH MODE TEST (SANDBOX)
// URLs HTTPS via ngrok
// =============================================
// Charge les variables d'environnement depuis le fichier .env situé dans le même dossier
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Auth-Token', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

// -------------------------------
// Middleware de sécurité
// -------------------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers['x-auth-token'];
  if (token !== process.env.AUTH_TOKEN) {
    return res.status(401).json({ success: false, message: 'Non autorisé' });
  }
  next();
};

// -------------------------------
// Endpoint de paiement
// -------------------------------
app.post('/api/pay', authMiddleware, async (req, res) => {
  const { method, phone, amount, currency } = req.body;

  if (!method || !phone || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Paramètres manquants (method, phone, amount)'
    });
  }

  const allowedMethods = ['wave', 'orange-money', 'free-money'];
  if (!allowedMethods.includes(method)) {
    return res.status(400).json({
      success: false,
      message: `Méthode de paiement non supportée : ${method}`
    });
  }

  try {
    const result = await payTechTestRequest(method, phone, amount, currency);
    res.json(result);
  } catch (error) {
    console.error('Erreur PayTech :', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Erreur interne du paiement.'
    });
  }
});

// -------------------------------
// Fonction d'appel à PayTech (mode test)
// -------------------------------
async function payTechTestRequest(method, phone, amount, currency) {
  const apiKey = process.env.PAYTECH_API_KEY;
  const apiSecret = process.env.PAYTECH_API_SECRET;

  let fullPhone = phone;
  if (!phone.startsWith('+')) {
    fullPhone = '+221' + phone.replace(/\s/g, '');
  }

  const refCommand = crypto.randomUUID();

  // URLs HTTPS (lues depuis le .env)
  const ipnUrl = process.env.IPN_URL;
  const successUrl = process.env.SUCCESS_URL;
  const cancelUrl = process.env.CANCEL_URL;

  if (!ipnUrl || !successUrl || !cancelUrl) {
    throw new Error('Les URLs IPN/Success/Cancel ne sont pas configurées dans le .env');
  }

  const body = {
    item_name: 'Paiement en ligne',
    item_price: amount.toString(),
    currency: currency || 'XOF',
    ref_command: refCommand,
    env: 'test',                         // mode test (sandbox)
    ipn_url: ipnUrl,                     // URL de notification
    successRedirectUrl: successUrl,      // Redirection après succès
    cancelRedirectUrl: cancelUrl,        // Redirection après annulation
    custom_field: JSON.stringify({
      method: method,
      phone: fullPhone
    })
  };

  const response = await axios.post(
    'https://paytech.sn/api/payment/request-payment',
    body,
    {
      headers: {
        'API_KEY': apiKey,
        'API_SECRET': apiSecret,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = response.data;

  if (data.success && data.redirect_url) {
    return {
      success: true,
      message: 'Redirection vers la plateforme de paiement…',
      redirect_url: data.redirect_url,
      transactionId: refCommand
    };
  } else {
    return {
      success: false,
      message: data.message || 'Échec de la création du paiement.'
    };
  }
}

// -------------------------------
// Endpoint IPN
// -------------------------------
app.post('/api/ipn', (req, res) => {
  console.log('📩 Notification IPN reçue :', req.body);
  res.status(200).send('OK');
});

// -------------------------------
// Démarrage du serveur
// -------------------------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API PayTech (test) en écoute sur http://localhost:${PORT}`);
  console.log('URLs HTTPS utilisées :');
  console.log(' - IPN      :', process.env.IPN_URL || 'non définie');
  console.log(' - Success  :', process.env.SUCCESS_URL || 'non définie');
  console.log(' - Cancel   :', process.env.CANCEL_URL || 'non définie');
});
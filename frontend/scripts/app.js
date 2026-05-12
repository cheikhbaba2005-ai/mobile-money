// =============================================
// CONFIGURATION (MODIFIABLE)
// =============================================
const CONFIG = {
  amount: 10000,
  currency: 'XOF',
  clientName: 'Cheikh Baba',
  // URL du backend (doit être l'URL ngrok du port 3001, pas localhost)
  apiBaseUrl: 'https://ton-app.onrender.com',
  authToken: 'a7f1c4e9d2b85a03f6e7c0d1a4b5e6f7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
};

// =============================================
// ÉTAT DE L'APPLICATION
// =============================================
let selectedMethod = null;

// =============================================
// SÉLECTION DES ÉLÉMENTS DU DOM
// =============================================
const elements = {
  clientName: document.getElementById('clientName'),
  amountDisplay: document.getElementById('amountDisplay'),
  methodButtons: document.querySelectorAll('.method-btn'),
  phoneInput: document.getElementById('phoneNumber'),
  phoneWrapper: document.querySelector('.phone-input-wrapper'),
  payBtn: document.getElementById('payBtn'),
  btnText: document.querySelector('.btn-text'),
  spinner: document.querySelector('.spinner'),
  statusDiv: document.getElementById('paymentStatus'),
};

// =============================================
// INITIALISATION DE L'AFFICHAGE
// =============================================
function initDisplay() {
  elements.clientName.textContent = CONFIG.clientName;
  elements.amountDisplay.textContent = CONFIG.amount.toLocaleString('fr-FR');
}

// =============================================
// GESTION DE LA SÉLECTION DU MOYEN DE PAIEMENT
// =============================================
function bindMethodSelection() {
  elements.methodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.methodButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMethod = btn.dataset.method;
      clearStatus();
    });
  });
}

// =============================================
// VALIDATION DU NUMÉRO
// =============================================
function validatePhone(phone) {
  if (!phone) return false;
  const clean = phone.replace(/^\+221/, '').replace(/\s/g, '');
  return /^\d{9}$/.test(clean);
}

// =============================================
// APPEL API (backend)
// =============================================
async function processPayment(phone) {
  const url = `${CONFIG.apiBaseUrl}/api/pay`;
  const cleanPhone = phone.replace(/^\+221/, '').replace(/\s/g, '');
  const payload = {
    method: selectedMethod,
    phone: `+221${cleanPhone}`,
    amount: CONFIG.amount,
    currency: CONFIG.currency,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': CONFIG.authToken,
        'ngrok-skip-browser-warning': '1'   // contourne l'avertissement ngrok
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Erreur serveur (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur réseau :', error);
    return { success: false, message: 'Impossible de contacter le serveur de paiement.' };
  }
}

// =============================================
// GESTION DU BOUTON PAIEMENT (avec redirection)
// =============================================
function bindPayment() {
  elements.payBtn.addEventListener('click', async () => {
    if (!selectedMethod) {
      showStatus('Veuillez choisir un moyen de paiement.', 'error');
      return;
    }

    const rawPhone = elements.phoneInput.value.trim();
    if (!validatePhone(rawPhone)) {
      showStatus('Numéro invalide (9 chiffres attendus).', 'error');
      shakePhoneInput();
      return;
    }

    setLoading(true);
    clearStatus();
    showStatus('Redirection vers le paiement…', 'loading');

    const result = await processPayment(rawPhone);

    if (result.success && result.redirect_url) {
      window.location.href = result.redirect_url;
    } else {
      setLoading(false);
      showStatus(`❌ ${result.message || 'Échec du paiement.'}`, 'error');
    }
  });
}

// =============================================
// FONCTIONS UTILITAIRES
// =============================================

function setLoading(isLoading) {
  const { payBtn, btnText, spinner } = elements;
  if (isLoading) {
    payBtn.disabled = true;
    spinner.classList.remove('hidden');
    btnText.textContent = 'Redirection…';
  } else {
    payBtn.disabled = false;
    spinner.classList.add('hidden');
    btnText.textContent = 'Payer maintenant';
  }
}

function showStatus(message, type) {
  const { statusDiv } = elements;
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  if (type !== 'loading') {
    clearTimeout(window._statusTimeout);
    window._statusTimeout = setTimeout(() => {
      statusDiv.className = 'status-message';
      statusDiv.textContent = '';
    }, 5000);
  }
}

function clearStatus() {
  const { statusDiv } = elements;
  statusDiv.className = 'status-message';
  statusDiv.textContent = '';
}

function shakePhoneInput() {
  const { phoneWrapper } = elements;
  phoneWrapper.classList.add('shake');
  setTimeout(() => phoneWrapper.classList.remove('shake'), 400);
}

function resetForm() {
  elements.phoneInput.value = '';
  elements.methodButtons.forEach(b => b.classList.remove('active'));
  selectedMethod = null;
}

// =============================================
// LANCEMENT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initDisplay();
  bindMethodSelection();
  bindPayment();
});
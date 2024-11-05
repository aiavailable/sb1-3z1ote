// API Usage Data
const MODEL_LIMITS = {
  'Claude 3.5 Sonnet 2024-10-22': {
    rpm: 1000,
    tpm: 80000,
    tpd: 2500000
  },
  'Claude 3.5 Sonnet 2024-06-20': {
    rpm: 1000,
    tpm: 80000,
    tpd: 2500000
  },
  'Claude 3.5 Haiku': {
    rpm: 1000,
    tpm: 100000,
    tpd: 25000000
  },
  'Claude 3 Opus': {
    rpm: 1000,
    tpm: 40000,
    tpd: 2500000
  },
  'Claude 3 Sonnet': {
    rpm: 1000,
    tpm: 80000,
    tpd: 2500000
  },
  'Claude 3 Haiku': {
    rpm: 1000,
    tpm: 100000,
    tpd: 25000000
  }
};

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const selectedTab = document.getElementById(tabId);
  const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);
  
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }
  if (selectedBtn) {
    selectedBtn.classList.add('active');
  }
}

// Settings Tab Functions
function saveSettings() {
  const anthropicKey = document.getElementById('anthropic-key').value;

  chrome.storage.sync.set({
    anthropicKey
  }, () => {
    updateStatus('Settings saved successfully!');
    detectTier();
  });
}

function loadSettings() {
  chrome.storage.sync.get(['anthropicKey'], (data) => {
    if (data.anthropicKey) {
      document.getElementById('anthropic-key').value = data.anthropicKey;
    }
  });
}

// Usage Stats Functions
function updateUsageStats() {
  chrome.storage.local.get([
    'anthropicTokensIn',
    'anthropicTokensOut',
    'anthropicCost'
  ], (data) => {
    document.getElementById('anthropic-tokens').textContent = 
      `${((data.anthropicTokensIn || 0) + (data.anthropicTokensOut || 0)).toLocaleString()} tokens`;
    document.getElementById('anthropic-cost').textContent = 
      `$${(data.anthropicCost || 0).toFixed(2)}`;
  });
}

// Limits Tab Functions
function populateLimitsTable() {
  const limitsBody = document.getElementById('limits-body');
  
  if (limitsBody) {
    limitsBody.innerHTML = '';
    Object.entries(MODEL_LIMITS).forEach(([model, limits]) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${model}</td>
        <td>${limits.rpm.toLocaleString()}</td>
        <td>${limits.tpm.toLocaleString()}</td>
        <td>${limits.tpd.toLocaleString()}</td>
      `;
      limitsBody.appendChild(row);
    });
  }
}

async function detectTier() {
  try {
    const tier = await fetchAnthropicTier();
    document.getElementById('anthropic-tier').textContent = tier || 'TIER 1';
  } catch (error) {
    console.error('Error detecting tier:', error);
  }
}

async function fetchAnthropicTier() {
  // Implement API call to Anthropic to detect tier
  return 'TIER 2'; // Placeholder
}

// Status Updates
function updateStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
  setTimeout(() => {
    status.textContent = '';
    status.className = 'status';
  }, 3000);
}

// Initialize Extension
document.addEventListener('DOMContentLoaded', () => {
  // Set up tab switching
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });

  // Initialize first tab
  switchTab('settings');

  // Load initial data
  loadSettings();
  updateUsageStats();
  populateLimitsTable();
  detectTier();

  // Set up settings form
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettings();
    });
  }

  // Set up contact sales button
  const contactSalesBtn = document.querySelector('.contact-sales');
  if (contactSalesBtn) {
    contactSalesBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.anthropic.com/contact-sales' });
    });
  }
});
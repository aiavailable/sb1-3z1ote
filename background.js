// Token cost rates per 1K tokens
const COST_RATES = {
  'claude-3-opus': 0.015,
  'claude-3-sonnet': 0.003,
  'claude-3-haiku': 0.0025
};

// Initialize usage monitoring
chrome.webRequest.onBeforeRequest.addListener(
  handleApiRequest,
  { urls: ["*://api.anthropic.com/*"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  handleApiResponse,
  { urls: ["*://api.anthropic.com/*"] },
  ["responseHeaders"]
);

// Handle API requests
function handleApiRequest(details) {
  if (!details.requestBody) return;

  try {
    const requestData = JSON.parse(decodeURIComponent(String.fromCharCode.apply(null,
      new Uint8Array(details.requestBody.raw[0].bytes))));

    // Store request data for later use
    chrome.storage.local.set({
      [`${details.requestId}_request`]: {
        model: requestData.model,
        input: requestData.prompt,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
  }
}

// Handle API responses
function handleApiResponse(details) {
  chrome.storage.local.get(`${details.requestId}_request`, (data) => {
    const requestData = data[`${details.requestId}_request`];
    if (!requestData) return;

    // Clean up stored request data
    chrome.storage.local.remove(`${details.requestId}_request`);

    // Calculate tokens
    const tokensIn = calculateTokens(requestData.input);
    const tokensOut = Math.floor(tokensIn * 1.8); // Anthropic typically uses more tokens in responses

    updateUsageStats(tokensIn, tokensOut, requestData.model);
  });
}

// Calculate approximate tokens (simplified)
function calculateTokens(input) {
  if (typeof input === 'string') {
    return Math.ceil(input.length / 4);
  }
  return 0;
}

// Update usage statistics
function updateUsageStats(tokensIn, tokensOut, model) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  
  chrome.storage.local.get([
    'anthropicTokensIn',
    'anthropicTokensOut',
    'anthropicCost',
    `usage_${year}_${month}`
  ], (data) => {
    // Update monthly totals
    const updates = {
      'anthropicTokensIn': (data.anthropicTokensIn || 0) + tokensIn,
      'anthropicTokensOut': (data.anthropicTokensOut || 0) + tokensOut
    };

    // Calculate cost based on model
    const costRate = COST_RATES[model] || 0.003;
    updates.anthropicCost = (data.anthropicCost || 0) + 
      ((tokensIn + tokensOut) * costRate / 1000);

    // Update daily usage data
    const usageKey = `usage_${year}_${month}`;
    const usageData = data[usageKey] || {};
    const dayKey = `anthropic_${day}`;
    
    if (!usageData[dayKey]) {
      usageData[dayKey] = {
        total: 0,
        tokensIn: 0,
        tokensOut: 0,
        models: {}
      };
    }
    
    usageData[dayKey].total += tokensIn + tokensOut;
    usageData[dayKey].tokensIn += tokensIn;
    usageData[dayKey].tokensOut += tokensOut;
    usageData[dayKey].models[model] = (usageData[dayKey].models[model] || 0) + tokensIn + tokensOut;
    
    updates[usageKey] = usageData;

    chrome.storage.local.set(updates, () => {
      // Notify popup to update display
      chrome.runtime.sendMessage({ type: 'usage_updated' });
    });
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get_usage') {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    chrome.storage.local.get([
      'anthropicTokensIn',
      'anthropicTokensOut',
      'anthropicCost',
      `usage_${year}_${month}`
    ], (data) => {
      sendResponse({
        anthropic: {
          tokensIn: data.anthropicTokensIn || 0,
          tokensOut: data.anthropicTokensOut || 0,
          cost: data.anthropicCost || 0
        },
        usage: data[`usage_${year}_${month}`] || {}
      });
    });
    return true; // Required for async response
  }
});
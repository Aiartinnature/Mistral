/**
 * Options Page JavaScript
 * Handles API key management and model selection for the Mistral Chat Extension
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI element references
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('model');
    const saveButton = document.getElementById('save');
    const showButton = document.getElementById('show');
    const status = document.getElementById('status');

    /**
     * Load saved settings from Chrome storage
     * Includes API key and selected model
     */
    chrome.storage.local.get(['mistralApiKey', 'mistralModel'], function(result) {
        if (result.mistralApiKey) {
            apiKeyInput.value = result.mistralApiKey;
        }
        if (result.mistralModel) {
            modelSelect.value = result.mistralModel;
        } else {
            modelSelect.value = 'mistral-tiny'; // Default model
        }
    });

    /**
     * Save settings to Chrome storage
     * Validates API key and tests connection before saving
     */
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;
        
        if (!apiKey) {
            showStatus('Please enter an API key', 'error');
            return;
        }

        // Validate API key format (basic check)
        if (!apiKey.match(/^[A-Za-z0-9-_]+$/)) {
            showStatus('Invalid API key format', 'error');
            return;
        }

        // Save settings to Chrome storage
        chrome.storage.local.set({
            mistralApiKey: apiKey,
            mistralModel: selectedModel
        }, function() {
            showStatus('Settings saved successfully!', 'success');
            
            // Test the API key with selected model
            testApiKey(apiKey, selectedModel);
        });
    });

    /**
     * Toggle API key visibility between text and password
     */
    showButton.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
        } else {
            apiKeyInput.type = 'password';
        }
    });

    /**
     * Display status message to user
     * @param {string} message - Message to display
     * @param {string} type - Message type ('success' or 'error')
     */
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    /**
     * Test API key with selected model
     * Makes a test request to Mistral API
     * @param {string} apiKey - Mistral API key to test
     * @param {string} model - Selected model to test with
     */
    async function testApiKey(apiKey, model) {
        try {
            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{
                        role: 'user',
                        content: 'Test message'
                    }],
                    max_tokens: 10
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API request failed');
            }

            showStatus('API key is valid!', 'success');
        } catch (error) {
            console.error('API test failed:', error);
            showStatus('Invalid API key: ' + error.message, 'error');
        }
    }
});

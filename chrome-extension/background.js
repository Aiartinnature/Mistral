/**
 * Background Service Worker for Mistral Chat Extension
 * Handles API communication and message routing between content script and Mistral AI API
 */

let chatWindow = null;

/**
 * Listen for clicks on the browser action
 */
chrome.action.onClicked.addListener(() => {
  if (chatWindow && !chatWindow.closed) {
    // If window exists and is not closed, focus it
    chatWindow.focus();
  } else {
    // Create a new window
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 800,
      height: 600
    }, (window) => {
      chatWindow = window;
    });
  }
});

/**
 * Store for API key
 */
chrome.storage.local.get(['mistralApiKey'], function(result) {
    if (!result.mistralApiKey) {
        console.log('No API key found');
    }
});

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'MISTRAL_API_REQUEST') {
        // Handle streaming API requests
        handleMistralRequest(request.messages, sender.tab.id);
        return true;
    } else if (request.action === 'mistralQuery') {
        // Handle legacy API requests
        handleMistralQuery(request.content, request.context)
            .then(response => sendResponse({ success: true, response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
});

/**
 * Handles a query to the Mistral AI API
 * @param {string} content - The user's message
 * @param {Object} context - The webpage context (title, content, etc.)
 * @returns {Promise<string>} The API response
 */
async function handleMistralQuery(content, context) {
    try {
        // Get API key from storage
        const { mistralApiKey } = await chrome.storage.local.get(['mistralApiKey']);
        
        if (!mistralApiKey) {
            throw new Error('API key not found. Please set it in the extension options.');
        }

        // Prepare system message with context
        const systemMessage = `You are a helpful AI assistant analyzing a webpage.
            Current page title: ${context.title}
            Current page content: ${context.content}
            
            Provide concise, relevant responses based on the webpage content.
            If asked about topics not related to the page, mention that you're focused on the current webpage.`;

        // Make API request
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-tiny',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Mistral API error:', error);
        throw error;
    }
}

/**
 * Handles streaming API requests to Mistral AI
 * @param {Array} messages - Array of message objects (role, content)
 * @param {number} tabId - ID of the current tab
 */
async function handleMistralRequest(messages, tabId) {
    try {
        // Get API key and model from storage
        const { mistralApiKey, mistralModel } = await chrome.storage.local.get(['mistralApiKey', 'mistralModel']);
        
        if (!mistralApiKey) {
            throw new Error('API key not found. Please set it in the extension options.');
        }

        const model = mistralModel || 'mistral-tiny'; // Fallback to tiny if not set
        
        // Make streaming API request
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            // Process each line of the streaming response
            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line === 'data: [DONE]') continue;
                
                try {
                    const cleanedLine = line.replace(/^data: /, '');
                    const parsed = JSON.parse(cleanedLine);
                    
                    // Send content updates to content script
                    if (parsed.choices?.[0]?.delta?.content) {
                        chrome.tabs.sendMessage(tabId, {
                            type: 'MISTRAL_API_RESPONSE',
                            content: parsed.choices[0].delta.content
                        });
                    }
                } catch (e) {
                    console.error('Error parsing streaming response:', e);
                }
            }
        }
    } catch (error) {
        console.error('Mistral API error:', error);
        // Send error message to content script
        chrome.tabs.sendMessage(tabId, {
            type: 'MISTRAL_API_ERROR',
            error: error.message
        });
    }
}

/**
 * Content Script for Mistral Chat Extension
 * Handles webpage integration, sidebar UI, and message routing
 */

/**
 * Create and initialize the sidebar interface
 * @returns {void}
 */
function createSidebar() {
    // Create container
    const container = document.createElement('div');
    container.id = 'mistral-sidebar-container';
    container.style.cssText = `
        position: fixed;
        top: 0;
        right: -400px;
        width: 400px;
        height: 100vh;
        background: white;
        box-shadow: -2px 0 5px rgba(0,0,0,0.1);
        z-index: 999999;
        transition: right 0.3s ease;
    `;
    
    // Create iframe for sidebar content
    const iframe = document.createElement('iframe');
    iframe.id = 'mistral-sidebar-iframe';
    iframe.src = chrome.runtime.getURL('sidebar.html');
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        background: white;
    `;
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'mistral-toggle-button';
    toggleButton.innerHTML = '&#128172;'; // Speech bubble emoji
    toggleButton.title = 'Toggle Mistral Chat (Ctrl+Shift+M)';
    toggleButton.style.cssText = `
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        z-index: 999998;
        background: #0d6efd;
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    `;

    // Add elements to page
    container.appendChild(iframe);
    document.body.appendChild(container);
    document.body.appendChild(toggleButton);

    // Set up event handlers
    setupEventHandlers(container, toggleButton);
    setupMessageHandlers(iframe);
}

/**
 * Set up event handlers for sidebar interaction
 * @param {HTMLElement} container - Sidebar container element
 * @param {HTMLElement} toggleButton - Toggle button element
 */
function setupEventHandlers(container, toggleButton) {
    // Toggle sidebar visibility
    toggleButton.addEventListener('click', () => {
        const isVisible = container.classList.contains('visible');
        container.style.right = isVisible ? '-400px' : '0';
        container.classList.toggle('visible');
        toggleButton.classList.toggle('active');
    });

    // Keyboard shortcut (Ctrl+Shift+M)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
            toggleButton.click();
        }
    });
}

/**
 * Set up message handlers for iframe communication
 * @param {HTMLIFrameElement} iframe - Sidebar iframe element
 */
function setupMessageHandlers(iframe) {
    // Handle messages from iframe
    window.addEventListener('message', (event) => {
        if (event.data.action === 'newMessage') {
            handleNewMessage(event.data.content, iframe);
        }
    });
}

/**
 * Handle new messages from the user
 * @param {string} content - User message content
 * @param {HTMLIFrameElement} iframe - Sidebar iframe element
 */
async function handleNewMessage(content, iframe) {
    try {
        // Get page context
        const context = await extractPageContext();

        // Send message to background script
        chrome.runtime.sendMessage({
            type: 'MISTRAL_API_REQUEST',
            messages: [
                {
                    role: 'system',
                    content: `You are analyzing this webpage:
                        Title: ${context.title}
                        URL: ${window.location.href}
                        Content: ${context.content}
                        
                        Provide helpful, concise responses based on the page content.`
                },
                {
                    role: 'user',
                    content: content
                }
            ]
        });
    } catch (error) {
        console.error('Error handling message:', error);
        iframe.contentWindow.postMessage({
            action: 'appendMessage',
            content: {
                role: 'error',
                content: 'Error: ' + error.message
            }
        }, '*');
    }
}

/**
 * Extract relevant context from the current webpage
 * @returns {Object} Page context including title and content
 */
async function extractPageContext() {
    return {
        title: document.title,
        url: window.location.href,
        content: extractMainContent()
    };
}

/**
 * Extract main content from the webpage
 * @returns {string} Extracted content
 */
function extractMainContent() {
    // Get all text content
    const textContent = Array.from(document.body.getElementsByTagName('*'))
        .filter(isElementVisible)
        .map(element => element.textContent)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Limit content length
    return textContent.slice(0, 5000);
}

/**
 * Check if an element is visible
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether the element is visible
 */
function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
}

// Handle messages from the parent window
function setupMessageHandlers(iframe) {
    window.addEventListener('message', async (event) => {
        console.log('Content script received message:', event.data);
        
        if (event.data.action === 'newMessage') {
            const userMessage = event.data.content;
            console.log('User message:', userMessage);
            
            // Send user message to iframe
            iframe.contentWindow.postMessage({
                action: 'appendMessage',
                content: {
                    role: 'user',
                    content: userMessage
                }
            }, '*');

            try {
                // Simulate AI response (replace with actual API call later)
                const response = "This is a test response from the assistant. Your message was: " + userMessage;
                
                // Send assistant's response back to iframe
                setTimeout(() => {
                    console.log('Sending assistant response:', response);
                    iframe.contentWindow.postMessage({
                        action: 'appendMessage',
                        content: {
                            role: 'assistant',
                            content: response
                        }
                    }, '*');
                }, 1000);
                
            } catch (error) {
                console.error('Error processing message:', error);
                // Send error message to iframe
                iframe.contentWindow.postMessage({
                    action: 'appendMessage',
                    content: {
                        role: 'assistant',
                        content: 'Sorry, there was an error processing your message.'
                    }
                }, '*');
            }
        }
    });
}

// Set up event handlers
function setupEventHandlers(container, toggleButton, resizer, saveButton, copyButton) {
    // Toggle sidebar
    function toggleSidebar() {
        container.classList.toggle('visible');
    }

    // Handle keyboard shortcuts
    function handleKeyPress(e) {
        // Ctrl/Cmd + Shift + M to toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            toggleSidebar();
        }
        // Escape to close sidebar
        if (e.key === 'Escape' && container.classList.contains('visible')) {
            toggleSidebar();
        }
    }

    // Handle resizing
    let isResizing = false;
    let startX;
    let startWidth;

    function startResizing(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(getComputedStyle(container).width, 10);
        resizer.classList.add('resizing');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
    }

    function handleMouseMove(e) {
        if (!isResizing) return;
        const width = startWidth - (e.clientX - startX);
        if (width > 300 && width < 800) {
            container.style.width = `${width}px`;
        }
    }

    function stopResizing() {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyPress);
    resizer.addEventListener('mousedown', startResizing);

    // Save and copy handlers
    saveButton.addEventListener('click', () => handleSaveConversation(container));
    copyButton.addEventListener('click', () => handleCopyConversation(container));
}

// Handle save button click
function handleSaveConversation(container) {
    try {
        const conversation = getConversationContent();
        if (!conversation) return;

        const blob = new Blob([conversation], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:]/g, '-').slice(0, 19);
        a.download = `mistral-chat-${timestamp}.md`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);

        // Show success animation
        const saveButton = container.querySelector('.mistral-header-button');
        saveButton.classList.add('success-animation');
        setTimeout(() => saveButton.classList.remove('success-animation'), 300);
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

// Handle copy button click
function handleCopyConversation(container) {
    try {
        const conversation = getConversationContent();
        if (!conversation) return;

        navigator.clipboard.writeText(conversation);
        
        // Show success animation
        const copyButton = container.querySelector('.mistral-header-button');
        copyButton.classList.add('success-animation');
        setTimeout(() => copyButton.classList.remove('success-animation'), 300);
    } catch (error) {
        console.error('Error copying conversation:', error);
    }
}

// Get conversation content from iframe
function getConversationContent() {
    return new Promise((resolve) => {
        const handler = (event) => {
            if (event.data.action === 'conversationContent') {
                window.removeEventListener('message', handler);
                resolve(event.data.content);
            }
        };
        window.addEventListener('message', handler);
        const iframe = document.getElementById('mistral-sidebar-iframe');
        iframe.contentWindow.postMessage({ 
            action: 'getConversation'
        }, '*');
        
        // Timeout after 2 seconds
        setTimeout(() => {
            window.removeEventListener('message', handler);
            resolve(null);
        }, 2000);
    });
}

// Wait for iframe to load before setting up message handlers
function setupMessageHandlers(iframe) {
    iframe.onload = () => {
    };
}

// Update sendPageContent function to include new analysis
async function sendPageContent(iframe) {
    window.mistralIframe = iframe; // Store iframe reference for context menu

    // Get main content
    const mainText = extractMainContent();
    
    // Get structured content with new analysis
    const content = {
        url: window.location.href,
        title: document.title,
        mainContent: mainText,
        metadata: {
            description: document.querySelector('meta[name="description"]')?.content || '',
            keywords: document.querySelector('meta[name="keywords"]')?.content || '',
            h1: Array.from(document.getElementsByTagName('h1')).map(h => h.textContent.trim()),
            h2: Array.from(document.getElementsByTagName('h2')).map(h => h.textContent.trim()),
            links: Array.from(document.getElementsByTagName('a'))
                .map(a => ({ text: a.textContent.trim(), href: a.href }))
                .filter(link => link.text && link.href)
                .slice(0, 10)
        },
        analysis: {
            images: analyzeImages(),
            tables: analyzeTables(),
            codeBlocks: detectCodeBlocks()
        },
        textContent: mainText.slice(0, 1500)
    };

    // Send content to iframe
    iframe.contentWindow.postMessage({
        action: 'pageContent',
        content: content
    }, '*');

    // Log content for debugging
    console.log('Enhanced page content sent to iframe:', content);
}

function extractMainContent() {
    // Try to find the main content container
    const contentSelectors = [
        'main',
        'article',
        '#content',
        '.content',
        '.main',
        '.article'
    ];

    let mainContent = null;
    for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            mainContent = element;
            break;
        }
    }

    // If no main content container found, use body
    if (!mainContent) {
        mainContent = document.body;
    }

    return getVisibleText(mainContent);
}

function getVisibleText(element) {
    if (!element) return '';
    
    // Check if element is visible
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return '';
    }

    // Skip common non-content elements
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'svg'];
    if (skipTags.includes(element.tagName)) {
        return '';
    }

    // Get text content
    let text = '';
    for (let child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            const trimmed = child.textContent.trim();
            if (trimmed) text += trimmed + ' ';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            text += getVisibleText(child) + ' ';
        }
    }
    return text.trim();
}

function analyzeImages() {
    const images = Array.from(document.getElementsByTagName('img'));
    return images.map(img => ({
        src: img.src,
        alt: img.alt,
        title: img.title,
        dimensions: {
            width: img.naturalWidth,
            height: img.naturalHeight
        },
        visible: isElementVisible(img),
        description: generateImageDescription(img)
    })).filter(img => img.visible).slice(0, 10); // Limit to 10 visible images
}

function generateImageDescription(img) {
    const description = [];
    if (img.alt) description.push(img.alt);
    if (img.title) description.push(img.title);
    
    // Check for surrounding text context
    const parentText = img.parentElement.textContent.trim();
    if (parentText && parentText.length < 100) {
        description.push(parentText);
    }
    
    // Check for caption
    const figcaption = img.parentElement.querySelector('figcaption');
    if (figcaption) {
        description.push(figcaption.textContent.trim());
    }
    
    return description.join(' - ');
}

function analyzeTables() {
    const tables = Array.from(document.getElementsByTagName('table'));
    return tables.map(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const rows = Array.from(table.querySelectorAll('tr')).slice(headers.length ? 1 : 0);
        const data = rows.map(row => 
            Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim())
        );
        return {
            headers,
            data: data.slice(0, 5), // Limit to first 5 rows
            rowCount: rows.length,
            colCount: headers.length || (data[0] ? data[0].length : 0)
        };
    }).filter(table => table.rowCount > 0).slice(0, 5); // Limit to 5 tables
}

function detectCodeBlocks() {
    const codeElements = Array.from(document.querySelectorAll('pre, code'));
    return codeElements.map(el => ({
        language: detectCodeLanguage(el),
        content: el.textContent.trim().slice(0, 500), // Limit code content
        lineCount: el.textContent.trim().split('\n').length
    })).filter(code => code.content.length > 0).slice(0, 5); // Limit to 5 code blocks
}

function detectCodeLanguage(element) {
    const classes = Array.from(element.classList);
    const languageClass = classes.find(cls => 
        cls.startsWith('language-') || 
        cls.startsWith('lang-') ||
        ['javascript', 'python', 'java', 'cpp', 'html', 'css'].includes(cls)
    );
    return languageClass ? languageClass.replace('language-', '').replace('lang-', '') : 'unknown';
}

function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0;
}

// Handle close action from iframe
window.addEventListener('message', (event) => {
    if (event.data.action === 'close') {
        const container = document.getElementById('mistral-sidebar-container');
        if (container) {
            container.classList.remove('visible');
        }
    }
});

// Initialize everything
const { container, iframe, toggleButton } = createSidebar();

// Add styles for context menu and highlights
const styles = document.createElement('style');
styles.textContent = `
    #mistral-context-menu {
        position: fixed;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        padding: 4px;
    }

    #mistral-context-menu button {
        display: block;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        white-space: nowrap;
    }

    #mistral-context-menu button:hover {
        background: #f0f0f0;
    }

    .mistral-highlight {
        background-color: #ffd70066;
        cursor: help;
    }
`;
document.head.appendChild(styles);

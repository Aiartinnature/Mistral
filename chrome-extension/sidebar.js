// Initialize UI elements
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const closeButton = document.getElementById('close-button');

    console.log('Sidebar initialized');

    // Function to append message
    function appendMessage(message) {
        console.log('Appending message:', message);
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}-message`;
        messageDiv.textContent = message.content;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Function to send message
    function sendMessage() {
        const content = messageInput.value.trim();
        if (!content) return;

        console.log('Sending message:', content);

        // Immediately display user message
        appendMessage({
            role: 'user',
            content: content
        });

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Send message to parent
        window.parent.postMessage({
            action: 'newMessage',
            content: content
        }, '*');
    }

    // Handle send button click
    sendButton.addEventListener('click', sendMessage);

    // Handle Enter key
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Handle close button
    closeButton.addEventListener('click', () => {
        window.parent.postMessage({ action: 'close' }, '*');
    });

    // Handle messages from parent
    window.addEventListener('message', (event) => {
        console.log('Received message in sidebar:', event.data);
        
        if (event.data.action === 'appendMessage' && event.data.content) {
            appendMessage(event.data.content);
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    });
});

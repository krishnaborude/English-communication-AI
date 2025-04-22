document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const speakButton = document.getElementById('speakButton');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    const micOverlay = document.getElementById('micOverlay');
    const typingIndicator = document.getElementById('typingIndicator');

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    let isRecording = false;

    recognition.onstart = () => {
        isRecording = true;
        micOverlay.classList.add('active');
    };

    recognition.onend = () => {
        if (isRecording) {
            recognition.start(); // Restart if still recording
        }
    };

    recognition.onresult = (event) => {
        const resultIndex = event.results.length - 1;
        const transcript = event.results[resultIndex][0].transcript;
        
        if (event.results[resultIndex].isFinal) {
            userInput.value = transcript;
            handleUserInput();
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && isRecording) {
            recognition.start(); // Restart on errors except no-speech
        }
    };

    // Welcome message handling for text input and mic button
    const welcomeMessage = document.getElementById('welcomeMessage');
    const hideWelcomeMessage = () => {
        if (welcomeMessage) {
            welcomeMessage.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => welcomeMessage.remove(), 300);
        }
    };

    speakButton.addEventListener('click', () => {
        hideWelcomeMessage();
        if (!isRecording) {
            userInput.value = ''; // Clear input before new recording
            userInput.placeholder = 'Listening...';
            speakButton.classList.add('recording');
            recognition.start();
        } else {
            userInput.placeholder = 'Type your message here...';
            speakButton.classList.remove('recording');
            recognition.stop();
        }
    });

    // Only stop recording when clicking outside the mic circle
    micOverlay.addEventListener('click', (e) => {
        if (e.target === micOverlay) {
            isRecording = false;
            recognition.stop();
            micOverlay.classList.remove('active');
            userInput.placeholder = 'Type your message here...';
        }
    });

    // Theme toggle functionality
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        localStorage.setItem('theme', newTheme);
    }

    // Set initial theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    themeToggle.addEventListener('click', toggleTheme);

    // Speech synthesis setup
    const synth = window.speechSynthesis;

    function speakText(text) {
        // Stop any current speech
        synth.cancel();

        // Create and configure utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for better clarity
        utterance.pitch = 1;
        utterance.volume = 1;

        // Add error handling
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            showToast('Failed to speak the message');
        };

        // Speak the text
        synth.speak(utterance);
    }

    // Welcome message handling
    welcomeMessage.style.display = 'block';
    welcomeMessage.style.opacity = '1';
    welcomeMessage.style.visibility = 'visible';

    // Character counter
    const charCount = document.getElementById('charCount');
    userInput.addEventListener('input', () => {
        const length = userInput.value.length;
        charCount.textContent = length;
        
        // Visual feedback when approaching limit
        if (length > 400) {
            charCount.style.color = '#e11d48';
        } else {
            charCount.style.color = 'var(--text-secondary)';
        }
    });

    // Toast notifications
    const toast = document.getElementById('toast');
    function showToast(message, duration = 2000) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + M for microphone
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            speakButton.click();
        }
        
        // Ctrl/Cmd + / to focus input with visual feedback
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            userInput.focus();
            userInput.classList.add('focus-flash');
            setTimeout(() => userInput.classList.remove('focus-flash'), 200);
        }

        // Escape to close any open overlay/sidebar
        if (e.key === 'Escape') {
            const activeElements = [
                { element: micOverlay, class: 'active' },
                { element: historySidebar, class: 'active' },
                { element: dropdownContent, class: 'show' }
            ];

            activeElements.forEach(({ element, class: className }) => {
                if (element?.classList.contains(className)) {
                    element.classList.remove(className);
                    showToast('Panel closed');
                }
            });
        }
    });

    function addMessage(text, isUser, linkedMessageId) {
        const messageDiv = document.createElement('div');
        const messageId = Date.now().toString(); // Generate unique ID for the message
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.setAttribute('role', 'log');
        messageDiv.dataset.messageId = messageId;
        
        if (!isUser && linkedMessageId) {
            messageDiv.dataset.linkedTo = linkedMessageId;
        }
        
        // Message content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content';
        
        // Message text
        const messageContent = document.createElement('div');
        messageContent.textContent = text;
        contentWrapper.appendChild(messageContent);
        
        messageDiv.appendChild(contentWrapper);
        
        // Message actions
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.setAttribute('aria-label', 'Copy message');
        copyBtn.innerHTML = '<i class="far fa-copy"></i>';
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(text);
                showToast('Message copied');
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                }, 2000);
            } catch (err) {
                showToast('Failed to copy message');
            }
        };
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'message-action-btn';
        deleteBtn.setAttribute('aria-label', 'Delete message');
        deleteBtn.innerHTML = '<i class="far fa-trash-alt"></i>';
        deleteBtn.onclick = () => {
            messageDiv.style.animation = 'fadeOut 0.3s ease forwards';
            
            if (isUser) {
                // Find and delete the linked AI response
                const linkedBotMessage = chatMessages.querySelector(`.bot-message[data-linked-to="${messageId}"]`);
                if (linkedBotMessage) {
                    linkedBotMessage.style.animation = 'fadeOut 0.3s ease forwards';
                    setTimeout(() => linkedBotMessage.remove(), 300);
                }
            }
            
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        };
        
        actions.appendChild(copyBtn);
        actions.appendChild(deleteBtn);
        messageDiv.appendChild(actions);
        
        // Add message with smooth scroll
        chatMessages.appendChild(messageDiv);
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

        // Speak bot messages
        if (!isUser) {
            speakText(text);
        }

        return messageId; // Return the message ID
    }

    // Improved input handling
    async function handleUserInput() {
        const text = userInput.value.trim();
        if (text) {
            // Remove welcome message if it exists
            hideWelcomeMessage();

            try {
                setLoadingState(true);
                const userMessageId = addMessage(text, true);
                
                userInput.value = '';
                charCount.textContent = '0';
                charCount.style.transition = 'color 0.3s ease';
                charCount.style.color = 'var(--text-secondary)';
                
                // Show typing indicator
                typingIndicator.style.display = 'flex';
                typingIndicator.style.animation = 'fadeIn 0.3s ease';
                
                // Simulate AI response
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                let response = "Hello! I'm your SpeakSharp assistant. How can I help you today?";
                if (text.toLowerCase().includes('hi') || text.toLowerCase().includes('hello')) {
                    response = "Hi there! Nice to meet you. Would you like to practice English conversation?";
                } else if (text.toLowerCase().includes('help')) {
                    response = "I can help you practice English! We can have conversations, work on pronunciation, or discuss specific topics you're interested in.";
                } else if (text.toLowerCase().includes('practice')) {
                    response = "Great! Let's practice. What topic would you like to discuss? We could talk about hobbies, travel, food, or anything else you're interested in.";
                }
                
                // Hide typing indicator with animation
                typingIndicator.style.animation = 'fadeOut 0.3s ease';
                
                setTimeout(() => {
                    typingIndicator.style.display = 'none';
                    addMessage(response, false, userMessageId);
                }, 300);
                
            } catch (error) {
                console.error('Error:', error);
                showToast('Unable to get a response. Please try again.');
                typingIndicator.style.display = 'none';
            } finally {
                setLoadingState(false);
            }
        }
    }

    // Improved loading state
    function setLoadingState(loading) {
        sendButton.disabled = loading;
        sendButton.classList.toggle('loading', loading);
        speakButton.disabled = loading;
        
        if (loading) {
            sendButton.setAttribute('aria-label', 'Sending...');
        } else {
            sendButton.setAttribute('aria-label', 'Send message');
        }
    }

    // Save message to history
    function saveToHistory(text, isUser) {
        // Implement history saving functionality here
        console.log('Saving to history:', { text, isUser });
    }

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });

    // Enhanced textarea auto-resize
    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        const newHeight = Math.min(userInput.scrollHeight, 120);
        userInput.style.height = newHeight + 'px';
        
        // Adjust button positions
        const buttons = document.querySelectorAll('.action-button');
        buttons.forEach(button => {
            button.style.marginBottom = Math.max(0, (newHeight - 56) / 2) + 'px';
        });
    }

    // Input handling
    userInput.addEventListener('input', () => {
        adjustTextareaHeight();
        
        const length = userInput.value.length;
        charCount.textContent = length;
        
        // Visual feedback when approaching limit
        if (length > 400) {
            charCount.style.color = '#e11d48';
            charCount.style.fontWeight = '600';
            if (length > 450) {
                charCount.style.animation = 'pulse 2s infinite';
            }
        } else {
            charCount.style.color = 'var(--text-secondary)';
            charCount.style.fontWeight = 'normal';
            charCount.style.animation = 'none';
        }

        // Disable send button when empty or at limit
        const isEmpty = length === 0;
        const isOverLimit = length > 500;
        sendButton.disabled = isEmpty || isOverLimit;
        sendButton.style.opacity = isEmpty ? '0.5' : '1';
        
        if (isOverLimit) {
            sendButton.classList.add('shake');
            setTimeout(() => sendButton.classList.remove('shake'), 500);
        }
    });

    // Add ripple effect to buttons
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.disabled) return;
            
            const ripple = document.createElement('div');
            ripple.className = 'ripple';
            this.appendChild(ripple);

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            
            const x = e.clientX - rect.left - size/2;
            const y = e.clientY - rect.top - size/2;
            
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Smooth placeholder transitions
    userInput.addEventListener('focus', () => {
        userInput.parentElement.classList.add('focused');
        if (!isRecording) {
            userInput.setAttribute('placeholder', 'Type your message... Press Enter to send');
        }
    });

    userInput.addEventListener('blur', () => {
        userInput.parentElement.classList.remove('focused');
        if (!isRecording) {
            userInput.setAttribute('placeholder', 'Type your message...');
        }
    });

    // Handle paste events to clean up text
    userInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const cleanText = text.replace(/\r\n/g, '\n'); // Normalize line endings
        document.execCommand('insertText', false, cleanText);
    });

    // Focus handling
    const input_wrapper = document.querySelector('.input-wrapper');
    userInput.addEventListener('focus', () => {
        input_wrapper.classList.add('focused');
        hideWelcomeMessage();
    });

    userInput.addEventListener('blur', () => {
        input_wrapper.classList.remove('focused');
    });

    // Initialize textarea height
    adjustTextareaHeight();

    // Sidebar functionality
    const historyLink = document.querySelector('.nav-item a i.fa-history').parentElement;
    const communicationLink = document.querySelector('.nav-item a i.fa-robot').parentElement;
    const historySidebar = document.getElementById('historySidebar');
    const chatContainer = document.querySelector('.chat-container');
    const closeSidebarButtons = document.querySelectorAll('.close-sidebar');

    // Open sidebar by default
    historySidebar.classList.add('active');
    chatContainer.classList.add('shift-right');

    historyLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (historySidebar.classList.contains('active')) {
            historySidebar.classList.remove('active');
            chatContainer.classList.remove('shift-right');
        } else {
            historySidebar.classList.add('active');
            chatContainer.classList.add('shift-right');
        }
    });

    communicationLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isRecording) {
            userInput.value = '';
            userInput.placeholder = 'Listening...';
            isRecording = true;
            recognition.start();
        } else {
            isRecording = false;
            userInput.placeholder = 'Type your message here...';
            recognition.stop();
            micOverlay.classList.remove('active');
        }
    });

    // Handle close button clicks
    closeSidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sidebar = button.closest('.sidebar');
            sidebar.classList.remove('active');
            chatContainer.classList.remove('shift-right', 'shift-left');
        });
    });
});

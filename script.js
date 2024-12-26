  const OPENROUTER_API_KEY = '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';

  let displayMessages = [];
  let conversationHistory = [];

  const modelConfigs = {
      'meta-llama/llama-3.2-3b-instruct:free': {
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: "Jesteś pomocnym asystentem AI. Odpowiadaj zawsze po polsku, używając naturalnego języka. Twoje odpowiedzi powinny być precyzyjne i kontekstowe.",
      },
      'anthropic/claude-2:free': {
          temperature: 0.8,
          max_tokens: 1500,
          system_prompt: "Jesteś polskojęzycznym asystentem AI. Używaj naturalnego języka polskiego i dostosowuj ton wypowiedzi do kontekstu.",
      }
  };

  function learnFromInteraction(userMessage, botResponse, feedback) {
      const interaction = {
          userMessage,
          botResponse,
          feedback,
          timestamp: Date.now()
      };
    
      const learningData = JSON.parse(localStorage.getItem('learningData') || '[]');
      learningData.push(interaction);
      localStorage.setItem('learningData', JSON.stringify(learningData));
  }

  async function sendMessage() {
      const input = document.getElementById('user-input');
      const message = input.value.trim();
      const selectedModel = document.getElementById('model-select').value;
    
      if (!message) return;

      displayMessages.push({ type: 'user', content: message });
      updateChatDisplay();
      input.value = '';

      const loadingId = addMessageToChat('Myślę nad odpowiedzią...', 'bot');
    
      // Przygotowujemy historię konwersacji dla API
      const apiMessages = [
          {
              role: 'system',
              content: modelConfigs[selectedModel].system_prompt
          },
          ...conversationHistory,
          { role: 'user', content: message }
      ];

      try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                  'HTTP-Referer': window.location.origin,
              },
              body: JSON.stringify({
                  model: selectedModel,
                  messages: apiMessages,
                  temperature: modelConfigs[selectedModel].temperature,
                  max_tokens: modelConfigs[selectedModel].max_tokens,
                  top_p: 0.9,
                  frequency_penalty: 0.5,
                  presence_penalty: 0.5
              })
          });

          const data = await response.json();
          removeMessage(loadingId);
        
          const botResponse = data.choices[0].message.content;
        
          // Aktualizujemy obie historie
          conversationHistory.push({ role: 'user', content: message });
          conversationHistory.push({ role: 'assistant', content: botResponse });
          displayMessages.push({ type: 'bot', content: botResponse });
        
          updateChatDisplay();
        
          learnFromInteraction(message, botResponse, null);
        
      } catch (error) {
          console.error('Error:', error);
          removeMessage(loadingId);
          displayMessages.push({ type: 'bot', content: 'Wystąpił błąd. Proszę spróbować ponownie.' });
          updateChatDisplay();
      }
  }

  function addMessageToChat(message, sender) {
      const chatMessages = document.getElementById('chat-messages');
      const messageDiv = document.createElement('div');
      const messageId = Date.now();
    
      messageDiv.id = messageId;
      messageDiv.className = `message ${sender}-message`;
      messageDiv.textContent = message;
    
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    
      return messageId;
  }

  function removeMessage(messageId) {
      const message = document.getElementById(messageId);
      if (message) message.remove();
  }

  function updateChatDisplay() {
      const chatMessages = document.getElementById('chat-messages');
      chatMessages.innerHTML = '';
    
      displayMessages.forEach(msg => {
          const messageDiv = document.createElement('div');
          messageDiv.className = `message ${msg.type}-message`;
          messageDiv.textContent = msg.content;
          chatMessages.appendChild(messageDiv);
      });
    
      chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function clearChat() {
      displayMessages = [];
      conversationHistory = [];
      updateChatDisplay();
  }

  document.getElementById('user-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
  });

  function rateResponse(messageId, rating) {
      const learningData = JSON.parse(localStorage.getItem('learningData') || '[]');
      const interaction = learningData.find(item => item.timestamp === messageId);
      if (interaction) {
          interaction.feedback = rating;
          localStorage.setItem('learningData', JSON.stringify(learningData));
      }
  }

  function analyzeLearningData() {
      const learningData = JSON.parse(localStorage.getItem('learningData') || '[]');
      const analytics = {
          totalInteractions: learningData.length,
          positiveRatings: learningData.filter(item => item.feedback === 'positive').length,
          negativeRatings: learningData.filter(item => item.feedback === 'negative').length,
          averageRating: 0
      };
    
      return analytics;
  }

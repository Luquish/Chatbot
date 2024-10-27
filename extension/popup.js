document.addEventListener('DOMContentLoaded', function() {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');

  chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
      sendMessage(message);
      chatInput.value = '';
    }
  });

  function sendMessage(message) {
    // Aquí implementaremos la lógica para enviar el mensaje al servidor
    // Por ahora, solo lo mostraremos en el popup
    const messageElement = document.createElement('div');
    messageElement.textContent = `Tú: ${message}`;
    chatMessages.appendChild(messageElement);

    // Simular respuesta del bot
    setTimeout(() => {
      const botResponse = document.createElement('div');
      botResponse.textContent = `Bot: Recibí tu mensaje: "${message}"`;
      chatMessages.appendChild(botResponse);
    }, 1000);
  }

  const statusElement = document.getElementById('status');
  const iframe = document.getElementById('chatFrame');

  iframe.onload = function() {
    statusElement.textContent = 'Chat loaded successfully!';
  };

  iframe.onerror = function() {
    statusElement.textContent = 'Error loading chat. Please check your connection.';
  };
});

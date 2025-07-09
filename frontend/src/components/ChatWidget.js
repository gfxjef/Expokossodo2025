import React, { useState, useEffect } from 'react';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '¡Hola! Soy el asistente de ExpoKossodo. ¿En qué puedo ayudarte?',
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      isIncoming: true
    }
  ]);
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Función para limpiar las referencias del vector store y procesar enlaces
  const cleanAndProcessMessage = (text) => {
    // Eliminar referencias del vector store como 【4:0†preguntas_recurrentes.json】
    let cleanedText = text.replace(/【[^】]+】/g, '');
    
    // Convertir enlaces markdown [texto](url) a HTML
    cleanedText = cleanedText.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>'
    );
    
    return cleanedText;
  };

  const handleSendMessage = async () => {
    if (inputText.trim() && !isLoading) {
      const userMessage = {
        id: messages.length + 1,
        text: inputText,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        isIncoming: false
      };

      setMessages(prevMessages => [...prevMessages, userMessage]);
      const currentInput = inputText; // Guardar el input antes de limpiarlo
      setInputText('');
      setIsLoading(true);

      try {
        const response = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: currentInput,
            thread_id: threadId
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al conectar con el asistente');
        }

        const data = await response.json();
        
        if (data.reply) {
          const assistantMessage = {
            id: messages.length + 2,
            text: data.reply,
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            isIncoming: true
          };
          setMessages(prevMessages => [...prevMessages, assistantMessage]);
        }
        
        if (data.thread_id) {
          setThreadId(data.thread_id);
        }

      } catch (error) {
        console.error('Error enviando mensaje:', error);
        const errorMessage = {
            id: messages.length + 2,
            text: `Lo siento, hubo un error: ${error.message}`,
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            isIncoming: true,
            isError: true
        };
        setMessages(prevMessages => [...prevMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  useEffect(() => {
    const chatBody = document.getElementById('chat-body');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }, [messages]);

  // Estilos CSS personalizados
  const styles = {
    chatContainer: {
      width: '320px',
      height: '480px', // Altura fija
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      height: '64px',
      background: 'linear-gradient(to right, #1d2236, #01295d)',
      borderTopLeftRadius: '12px',
      borderTopRightRadius: '12px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#E5E7EB',
      backgroundImage: 'url("https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop")',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    },
    statusDot: {
      width: '12px',
      height: '12px',
      backgroundColor: '#4CAF50',
      border: '2px solid #1d2236',
      borderRadius: '50%',
      bottom: '-1px',
      right: '-1px'
    },
    messagesBody: {
      flex: 1,
      backgroundColor: '#f9fafb',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    footer: {
      backgroundColor: '#f9fafb',
      borderTop: '1px solid #e5e7eb',
      borderBottomLeftRadius: '12px',
      borderBottomRightRadius: '12px',
      padding: '8px'
    },
    sendButton: {
      width: '40px',
      height: '40px',
      backgroundColor: '#67b699',
      borderRadius: '50%',
      border: 'none',
      boxShadow: '0 2px 8px rgba(103, 182, 153, 0.3)',
      cursor: 'pointer'
    },
    floatingButton: {
      width: '60px',
      height: '60px',
      backgroundColor: '#67b699',
      borderRadius: '50%',
      border: 'none',
      boxShadow: '0 4px 12px rgba(103, 182, 153, 0.4)',
      cursor: 'pointer'
    }
  };

  return (
    <div className="fixed bottom-9 right-6 z-50 flex flex-col items-end">
      {/* Chat Widget */}
      {isOpen && (
        <div 
          className="chat-container mb-4 animate-fade-in"
          style={styles.chatContainer}
        >
          {/* Header */}
          <div 
            className="chat-header flex items-center px-4 relative"
            style={styles.header}
          >
            {/* Avatar with Status */}
            <div className="relative">
              <div 
                className="avatar-container"
                style={styles.avatar}
              />
              <div 
                className="status-dot absolute"
                style={styles.statusDot}
              />
            </div>
            
            {/* Name */}
            <div className="ml-3 flex-1">
              <span 
                className="text-white font-medium"
                style={{
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Soporte ExpoKossodo
              </span>
            </div>

            {/* Close Button */}
            <button 
              onClick={toggleChat}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Messages Body con altura fija y scroll */}
          <div 
            id="chat-body" 
            style={styles.messagesBody}
            className="custom-scrollbar"
          >
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isIncoming ? 'justify-start' : 'justify-end'}`}>
                <div 
                  className={`message-bubble p-3 rounded-lg max-w-[80%] ${
                    message.isError 
                      ? 'bg-red-500 text-white' 
                      : message.isIncoming 
                        ? 'bg-gradient-to-r from-[#6fb698] to-[#6cb799] text-white' 
                        : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p 
                    className="text-sm whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ 
                      __html: message.isIncoming ? cleanAndProcessMessage(message.text) : message.text 
                    }}
                  />
                  <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="message-bubble p-3 rounded-lg bg-gray-200">
                      <div className="flex items-center justify-center space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast animation-delay-200"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast animation-delay-400"></div>
                      </div>
                  </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="chat-footer flex items-center gap-2"
            style={styles.footer}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="¿Necesitas ayuda?..."
              className="flex-1 p-2 border-none outline-none text-sm bg-transparent"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                color: '#333333'
              }}
            />
            <button
              onClick={handleSendMessage}
              className="send-button flex items-center justify-center transition-transform hover:scale-105"
              style={styles.sendButton}
              disabled={isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className="floating-button flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={styles.floatingButton}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>
    </div>
  );
};

export default ChatWidget; 
// app/chat/page.tsx

'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import FeedbackButton from '../../components/ui/FeedbackButtons';
import { useRouter } from 'next/navigation';
import { useSession, SessionProvider } from 'next-auth/react';

function ChatComponent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { messages, input, handleInputChange, handleSubmit } = useChat({
      maxToolRoundtrips: 2,
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showFeedback, setShowFeedback] = useState<boolean>(false);
    const [currentFeedbackMessage, setCurrentFeedbackMessage] = useState<{ prompt: string; response: string } | null>(null);
  
    useEffect(() => {
      if (status === 'unauthenticated') {
        router.push('/auth/signin');
      }
    }, [status, router]);
  
    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  
      // Determinar aleatoriamente si se muestra el feedback (ejemplo: 5% de probabilidad)
      const shouldShow = Math.random() < 0.05;
      if (shouldShow && messages.length >= 2) {
        const lastMessage = messages[messages.length - 1];
        const previousMessage = messages[messages.length - 2];
        
        // Verificar que el último mensaje no sea del usuario y el anterior sí
        if (lastMessage.role !== 'user' && previousMessage.role === 'user') {
          setCurrentFeedbackMessage({
            prompt: previousMessage.content,
            response: lastMessage.content,
          });
          setShowFeedback(true);
        }
      }
    }, [messages]);
  
    if (status === 'loading') {
      return <div>Loading...</div>;
    }
  
    if (!session) {
      return null;
    }
  
    // Función para ocultar los botones de feedback después de enviar
    const handleFeedbackSubmit = () => {
      setShowFeedback(false);
      setCurrentFeedbackMessage(null);
    };

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen" style={{ backgroundColor: '#1E1E1E' }}>
      {/* Chat container */}
      <div className="flex flex-col w-full max-w-3xl h-full">
        {/* Mensajes */}
        <div className="flex-1 p-6 overflow-y-auto text-white" style={{ marginRight: '-17px', paddingRight: '17px' }}>
          <div className="space-y-4">
            {messages.map(m => (
              <div
                key={m.id}
                className={`whitespace-pre-wrap flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-3 rounded-lg shadow-lg ${
                    m.role === 'user' ? 'bg-gray-800 text-white' : 'bg-green-500 text-white'
                  }`}
                  style={{
                    maxWidth: '80%',
                    minWidth: '150px',
                    minHeight: '50px',
                    borderRadius: '15px',
                  }}
                >
                  <div className={`font-bold ${m.role === 'user' ? 'text-green-400' : 'text-white'}`}>
                    {m.role === 'user' ? 'You' : 'Onwy'}
                  </div>
                  <p className="mt-1">
                    {m.content.length > 0 ? (
                      m.content
                    ) : (
                      <span className="italic font-light">
                        {'calling tool: ' + m?.toolInvocations?.[0]?.toolName}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {/* Ref para el auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Botón de Feedback (encima de la barra de entrada) */}
        {showFeedback && currentFeedbackMessage && (
          <div className="flex justify-center mb-4">
            <FeedbackButton
              prompt={currentFeedbackMessage.prompt}
              response={currentFeedbackMessage.response}
              onFeedbackSubmit={handleFeedbackSubmit}
            />
          </div>
        )}

        {/* Barra de entrada de mensajes */}
        <form onSubmit={handleSubmit} className="p-4 relative">
          <input
            className="w-full p-3 bg-gray-800 text-white rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-offset-2 transition-all duration-300 ease-in-out"
            value={input}
            placeholder="Type your message here..."
            onChange={handleInputChange}
          />
        </form>
      </div>
    </div>
  );
}

export default function Chat() {
  return (
    <SessionProvider>
      <ChatComponent />
    </SessionProvider>
  );
}
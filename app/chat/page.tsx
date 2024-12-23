// app/chat/page.tsx

'use client';

import { useChat, Message as ChatMessage } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import FeedbackButton from '@/app/chat/components/FeedbackButtons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, SessionProvider, signOut } from 'next-auth/react';
import ProactiveMessages from '@/app/chat/components/ProactiveMessages';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from "@/components/ui/button"
import { Send, Loader2 } from 'lucide-react'; // Importa los iconos
import ReactMarkdown from 'react-markdown';
import { Suspense } from 'react';

// Componente separado para el contenido del chat
function ChatContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isExtension = searchParams.get('extension') === 'true';
    const [isBotResponding, setIsBotResponding] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<string>('');
    const [displayedContent, setDisplayedContent] = useState<string>('');
    const [isTyping, setIsTyping] = useState(false);
    const { messages: rawMessages, input, handleInputChange, handleSubmit, append } = useChat({
      maxToolRoundtrips: 2,
      onResponse: () => {
        setIsBotResponding(true);
        setPendingMessage('');
      },
      onFinish: (message) => {
        setIsBotResponding(false);
        setPendingMessage('');
        // Iniciar efecto de typing cuando el mensaje está completo
        if (message.role === 'assistant') {
          setIsTyping(true);
          setDisplayedContent('');
          let index = 0;
          const text = message.content;
          
          const typingInterval = setInterval(() => {
            setDisplayedContent((prev) => {
              if (index < text.length) {
                index++;
                return text.slice(0, index);
              }
              clearInterval(typingInterval);
              setIsTyping(false);
              return text;
            });
          }, 20); // Ajusta esta velocidad según prefieras
        }
      },
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showFeedback, setShowFeedback] = useState<boolean>(false);
    const [currentFeedbackMessage, setCurrentFeedbackMessage] = useState<{ prompt: string; response: string } | null>(null);

  // Efecto para redirigir si no hay sesión (solo si no es la extensión)
  useEffect(() => {
    if (!isExtension && status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router, isExtension]);

    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [rawMessages]);

    useEffect(() => {
      if (rawMessages.length >= 2) {
        const lastMessage = rawMessages[rawMessages.length - 1];
        const previousMessage = rawMessages[rawMessages.length - 2];
        
        if (lastMessage.role !== 'user' && previousMessage.role === 'user' && !showFeedback) {
          setCurrentFeedbackMessage({
            prompt: previousMessage.content,
            response: lastMessage.content,
          });
          setShowFeedback(true);
        }
      }
    }, [rawMessages, showFeedback]);

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

    // Nueva función para añadir mensajes programáticamente
    const addHiddenUserMessage = (message: string) => {
      const hiddenUserMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: `__PROACTIVE_TRIGGER__${message}`,
      };
      append(hiddenUserMessage); // Utiliza el método append para añadir el mensaje
      // Después de añadir el mensaje, puedes llamar a handleSubmit si es necesario
      handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
    };
    // Manejador para mensajes proactivos
    const handleProactiveMessage = (message: string) => {
        console.log('Triggering proactive message:', message);
        addHiddenUserMessage(message);
    };

    // Función para enviar el mensaje
    const sendMessage = () => {
      if (input.trim() !== '') {
        handleSubmit();
      }
    };

    // Manejador de eventos de teclado
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
    // Función para cerrar sesión
    const handleSignOut = async () => {
        await signOut({ redirect: false });
        router.push('/');
    };

    // Filtrar y procesar mensajes para incluir el mensaje pendiente
    const messages = rawMessages
      .filter(m => !m.content.startsWith('__PROACTIVE_TRIGGER__'))
      .filter(m => m.content.length > 0 && !m.content.startsWith('calling tool:'))
      .map(m => {
        if (m.role === 'assistant' && m === rawMessages[rawMessages.length - 1]) {
          if (isBotResponding) {
            return null;
          }
          // Mostrar el contenido con efecto de typing para el último mensaje del asistente
          return {
            ...m,
            content: isTyping ? displayedContent : m.content
          };
        }
        return m;
      })
      .filter(Boolean) as ChatMessage[];

  // Renderizado del componente
  return (
    <div className={`flex flex-col items-center justify-center w-full ${isExtension ? 'h-full' : 'h-screen'}`} style={{ backgroundColor: '#1E1E1E' }}>
      {/* Botón de cierre de sesión (solo si no es la extensión) */}
      {!isExtension && (
        <div className="absolute top-4 right-4">
          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            className="bg-white text-black border-white hover:bg-black hover:text-white transition-colors duration-300"
          >
            Cerrar Sesión
          </Button>
        </div>
      )}

      <ProactiveMessages onSendProactiveMessage={handleProactiveMessage} />
      {/* Chat container */}
      <div className={`flex flex-col w-full ${isExtension ? 'max-w-full' : 'max-w-3xl'} h-full`}>
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
                    m.role === 'user' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-white'
                  }`}
                  style={{
                    maxWidth: '80%',
                    minWidth: '150px',
                    minHeight: '50px',
                    borderRadius: '15px',
                  }}
                >
                  <div className={`font-bold ${m.role === 'user' ? 'text-green-400' : 'text-blue-300'}`}>
                    {m.role === 'user' ? 'You' : 'Onwy'}
                  </div>
                  <div className="mt-1 markdown-content whitespace-normal">
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            className="text-blue-400 hover:text-blue-300 break-all"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                        p: ({ node, ...props }) => (
                          <p {...props} className="mb-2 last:mb-0 whitespace-pre-line" />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong {...props} className="font-bold" />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul {...props} className="list-disc pl-6 mb-2" />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} className="list-decimal pl-6 mb-2" />
                        ),
                        li: ({ node, ...props }) => (
                          <li {...props} className="mb-1" />
                        ),
                      }}
                    >
                      {m.content.trim()}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {/* Mostrar el indicador de escritura mientras el bot está respondiendo */}
            {isBotResponding && (
              <div className="flex justify-start">
                <div
                  className="p-3 rounded-lg shadow-lg bg-gray-700 text-white"
                  style={{
                    maxWidth: '80%',
                    minWidth: '150px',
                    minHeight: '50px',
                    borderRadius: '15px',
                  }}
                >
                  <div className="font-bold text-blue-300">
                    Onwy
                  </div>
                  <div className="mt-1 flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" 
                         style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" 
                         style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" 
                         style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

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
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="p-4 relative w-full">
          <div className="relative">
            <TextareaAutosize
              className={`w-full p-3 pr-12 bg-gray-800 text-white rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-offset-2 transition-all duration-300 ease-in-out resize-none overflow-y-auto`}
              value={input}
              placeholder="Escribe tu mensaje aquí..."
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              minRows={1}
              maxRows={5}
              style={{
                height: undefined,
              }}
            />
            <button
              type="submit"
              disabled={input.trim() === '' || isBotResponding}
              className={`absolute right-2 bottom-3 p-2 rounded-full transition-colors duration-200 ${
                input.trim() === '' || isBotResponding
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-green-500 hover:text-green-600'
              }`}
            >
              {isBotResponding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente principal envuelto en Suspense
function ChatComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}

// Componente de la página
export default function Chat() {
  return (
    <SessionProvider>
      <ChatComponent />
    </SessionProvider>
  );
}

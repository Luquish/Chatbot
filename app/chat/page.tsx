// app/chat/page.tsx

'use client';

import { useChat, Message as ChatMessage } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import FeedbackButton from '@/app/chat/components/FeedbackButtons';
import { useRouter } from 'next/navigation';
import { useSession, SessionProvider, signOut } from 'next-auth/react';
import ProactiveMessages from '@/app/chat/components/ProactiveMessages';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from "@/components/ui/button"
import { Send, Loader2 } from 'lucide-react'; // Importa los iconos

// Componente principal de la página de chat
function ChatComponent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isBotResponding, setIsBotResponding] = useState(false);
    const { messages, input, handleInputChange, handleSubmit, append } = useChat({
      maxToolRoundtrips: 2,
      onResponse: () => {
        setIsBotResponding(true);
      },
      onFinish: () => {
        setIsBotResponding(false);
      },
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showFeedback, setShowFeedback] = useState<boolean>(false);
    const [currentFeedbackMessage, setCurrentFeedbackMessage] = useState<{ prompt: string; response: string } | null>(null);

  // Efecto para redirigir si no hay sesión
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }

      // Mostrar feedback después de cada respuesta del asistente
      if (messages.length >= 2) {
        const lastMessage = messages[messages.length - 1];
        const previousMessage = messages[messages.length - 2];
        
        // Verificar que el último mensaje sea del asistente y el anterior del usuario
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
      if (!isBotResponding && input.trim() !== '') {
        setIsBotResponding(true);
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

  // Renderizado del componente
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen" style={{ backgroundColor: '#1E1E1E' }}>
      {/* Botón de cierre de sesión */}
      <div className="absolute top-4 right-4">
        <Button 
          onClick={handleSignOut} 
          variant="outline" 
          className="bg-white text-black border-white hover:bg-black hover:text-white transition-colors duration-300"
        >
          Cerrar Sesión
        </Button>
      </div>

      <ProactiveMessages onSendProactiveMessage={handleProactiveMessage} />
      {/* Chat container */}
      <div className="flex flex-col w-full max-w-3xl h-full">
        {/* Mensajes */}
        <div className="flex-1 p-6 overflow-y-auto text-white" style={{ marginRight: '-17px', paddingRight: '17px' }}>
          <div className="space-y-4">
          {messages.filter(m => !m.content.startsWith('__PROACTIVE_TRIGGER__')).map(m => (
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

            {/* Indicador "Bot is typing..." */}
            {isBotResponding && (
              <div className="whitespace-pre-wrap flex justify-start">
                <div
                  className="p-3 rounded-lg shadow-lg bg-green-500 text-white"
                  style={{
                    maxWidth: '80%',
                    minWidth: '150px',
                    minHeight: '50px',
                    borderRadius: '15px',
                  }}
                >
                  <div className="font-bold text-white">Onwy</div>
                  <p className="mt-1 italic">Bot is typing...</p>
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
              placeholder="Type your message here..."
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              // Removido el atributo 'disabled'
              minRows={1}
              maxRows={5}
              style={{
                height: undefined,
              }}
            />
            <button
              type="submit"
              disabled={isBotResponding || input.trim() === ''}
              className={`absolute right-2 bottom-3 p-2 rounded-full transition-colors duration-200 ${
                isBotResponding || input.trim() === ''
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

export default function Chat() {
  return (
    <SessionProvider>
      <ChatComponent />
    </SessionProvider>
  );
}

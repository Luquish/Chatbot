'use client'

import { useChat } from 'ai/react'
import { useState, useRef, useEffect } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import ReactMarkdown from 'react-markdown'
import { Send, Loader2 } from 'lucide-react'

export default function ChatPlugin() {
  const [isBotResponding, setIsBotResponding] = useState(false)
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    maxToolRoundtrips: 2,
    onResponse: () => setIsBotResponding(true),
    onFinish: () => setIsBotResponding(false),
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [welcomeMessageShown, setWelcomeMessageShown] = useState(true)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const sendAutoMessage = (message: string) => {
    handleInputChange({ target: { value: message } } as any)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleSubmit(new Event('submit') as any)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(new Event('submit') as any)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const [calendarMenuVisible, setCalendarMenuVisible] = useState(false)
  const [meetingMenuVisible, setMeetingMenuVisible] = useState(false)

  const handleUserMessage = (e: React.FormEvent) => {
    if (welcomeMessageShown) {
      setWelcomeMessageShown(false)
    }
    handleSubmit(e)
  }

  return (
    <div className="flex flex-col w-full h-screen bg-gray-900">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        <div className="flex flex-col justify-end min-h-full p-4">
          {welcomeMessageShown && (
            <div className="flex justify-center mb-4">
              <div className="bg-[#27FF98] p-6 rounded-lg shadow-xl max-w-md w-full text-center">
                <h2 className="text-black text-2xl font-semibold">¡Bienvenido a Onwy!</h2>
                <p className="text-black mt-4 text-sm">
                  Estoy aquí para ayudarte a organizar tu día y mejorar tu productividad. ¿En qué puedo asistirte hoy?
                </p>
              </div>
            </div>
          )}

          {messages
            .filter(m => m.content.length > 0 && !m.content.startsWith('calling tool:'))
            .map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
              >
                <div
                  className={`p-3 rounded-lg shadow ${
                    m.role === 'user' ? 'bg-[#27FF98] text-gray-700' : 'bg-gray-700 text-white'
                  }`}
                  style={{ maxWidth: '80%', wordBreak: 'break-word' }}
                >
                  <div className={`text-xs ${m.role === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>
                    {m.role === 'user' ? 'You' : 'Onwy'}
                  </div>
                  <ReactMarkdown className="mt-1 text-sm">{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          {isBotResponding && (
            <div className="flex justify-start mb-2">
              <div className="p-3 rounded-lg shadow bg-gray-700 text-white" style={{ maxWidth: '80%' }}>
                <div className="text-xs text-gray-400">Onwy</div>
                <p className="mt-1 text-sm italic">Escribiendo...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex justify-center space-x-4 p-4 bg-gray-800">
        <div className="relative">
          <button
            onClick={() => setCalendarMenuVisible(!calendarMenuVisible)}
            className="flex items-center justify-center w-32 h-8 bg-white text-black rounded-full hover:bg-[#8B4CFF] hover:text-white transition-colors duration-200"
          >
            📅 <span className="ml-2 text-xs">Calendario</span>
          </button>
          {calendarMenuVisible && (
            <div className="absolute bottom-12 left-0 bg-gray-800 text-white rounded-lg shadow-lg w-48 p-2">
              <button
                className="w-full p-2 text-left hover:bg-gray-600"
                onClick={() => {
                  sendAutoMessage("Que eventos tengo hoy en el calendario")
                  setCalendarMenuVisible(false)
                }}
              >
                ¿Qué tengo hoy?
              </button>
              <button
                className="w-full p-2 text-left hover:bg-gray-600"
                onClick={() => {
                  sendAutoMessage("Que eventos tengo esta semana en el calendario que no puedo olvidar")
                  setCalendarMenuVisible(false)
                }}
              >
                ¿Qué tengo esta semana?
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMeetingMenuVisible(!meetingMenuVisible)}
            className="flex items-center justify-center w-32 h-8 bg-white text-black rounded-full hover:bg-[#8B4CFF] hover:text-white transition-colors duration-200"
          >
            📞 <span className="ml-2 text-xs">Reunión</span>
          </button>
          {meetingMenuVisible && (
            <div className="absolute bottom-12 left-0 bg-gray-800 text-white rounded-lg shadow-lg w-48 p-2">
              <button
                className="w-full p-2 text-left hover:bg-gray-600"
                onClick={() => {
                  sendAutoMessage("Me podrías agendar una reunión")
                  setMeetingMenuVisible(false)
                }}
              >
                Agendar reunión
              </button>
              <button
                className="w-full p-2 text-left hover:bg-gray-600"
                onClick={() => {
                  sendAutoMessage("Estoy teniendo problemas para preparar y agendar reuniones lo más eficientemente posible")
                  setMeetingMenuVisible(false)
                }}
              >
                Ayuda
              </button>
            </div>
          )}
        </div>

        <button
          className="flex items-center justify-center w-32 h-8 bg-white text-black rounded-full hover:bg-[#8B4CFF] hover:text-white transition-colors duration-200"
          onClick={() => sendAutoMessage("Quiero aprender algo sobre cursos")}
        >
          📚 <span className="ml-2 text-xs">Cursos</span>
        </button>
      </div>

      <form onSubmit={handleUserMessage} className="p-4 bg-gray-800">
        <div className="relative">
          <TextareaAutosize
            className="w-full p-2 pr-10 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu mensaje..."
            minRows={1}
            maxRows={3}
          />
          <button
            type="submit"
            disabled={input.trim() === '' || isBotResponding}
            className={`absolute right-2 bottom-2 p-1 rounded-full transition-colors duration-200 ${
              input.trim() === '' || isBotResponding
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-[#27FF98] hover:text-white'
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
  )
}
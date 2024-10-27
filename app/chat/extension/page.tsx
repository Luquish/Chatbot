'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
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

  const sendMessage = () => {
    if (input.trim() !== '') {
      handleSubmit(new Event('submit') as any)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col w-full h-screen bg-gray-900">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        <div className="flex flex-col justify-end min-h-full p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
            >
              <div
                className={`p-3 rounded-lg shadow ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                }`}
                style={{ maxWidth: '80%', wordBreak: 'break-word' }}
              >
                <div className={`text-xs ${m.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {m.role === 'user' ? 'You' : 'Onwy'}
                </div>
                <p className="mt-1 text-sm">{m.content}</p>
              </div>
            </div>
          ))}
          {isBotResponding && (
            <div className="flex justify-start mb-2">
              <div className="p-3 rounded-lg shadow bg-gray-700 text-white" style={{ maxWidth: '80%' }}>
                <div className="text-xs text-gray-400">Onwy</div>
                <p className="mt-1 text-sm italic">Typing...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="p-4 bg-gray-800">
        <div className="relative">
          <TextareaAutosize
            className="w-full p-2 pr-10 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            minRows={1}
            maxRows={3}
          />
          <button
            type="submit"
            disabled={input.trim() === '' || isBotResponding}
            className={`absolute right-2 bottom-2 p-1 rounded-full transition-colors duration-200 ${
              input.trim() === '' || isBotResponding
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-500 hover:text-blue-600'
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

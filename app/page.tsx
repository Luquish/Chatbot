'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'


const words = ["VIVIR", "DESCUBRIR", "POTENCIAR", "DISFRUTAR", "PENSAR"]

export default function LandingPage() {
  const [currentWord, setCurrentWord] = useState(0)
  const [hoverButton, setHoverButton] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length)
    }, 3000) // Cambiado a 3 segundos

    return () => clearInterval(interval)
  }, [])

  const handleSignIn = () => {
    router.push('/auth/signin')
  }

  const handleRegister = () => {
    router.push('/auth/register')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 leading-tight flex flex-col items-center">
          <span>Una nueva forma de</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentWord}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-5xl sm:text-6xl md:text-7xl my-6 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text"
            >
              {words[currentWord]}
            </motion.span>
          </AnimatePresence>
          <span>la cultura de tu empresa</span>
        </h1>
        <p className="text-xl md:text-2xl mb-12 text-gray-300">
          IA aplicada para acompañar y potenciar una cultura de innovación y crecimiento en tus equipos.
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-8">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="bg-transparent border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white transition-all duration-300 text-lg sm:text-xl py-4 sm:py-6 px-6 sm:px-8 w-full sm:w-auto"
            onMouseEnter={() => setHoverButton('signin')}
            onMouseLeave={() => setHoverButton(null)}
            onClick={handleSignIn}
          >
            Iniciar Sesión
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="bg-transparent border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-all duration-300 text-lg sm:text-xl py-4 sm:py-6 px-6 sm:px-8 w-full sm:w-auto"
            onMouseEnter={() => setHoverButton('register')}
            onMouseLeave={() => setHoverButton(null)}
            onClick={handleRegister}
          >
            Registrarse
          </Button>
        </motion.div>
      </div>

      <div className="h-20 mt-8">
        <AnimatePresence mode="wait">
          {hoverButton && (
            <motion.div
              key={hoverButton}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-gray-400 text-lg sm:text-xl"
            >
              {hoverButton === 'signin' ? (
                <p>¡Bienvenido de vuelta! Inicia sesión para continuar tus conversaciones.</p>
              ) : (
                <p>¿Nuevo en Onwy Chat? ¡Crea una cuenta y comienza a chatear!</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-8 text-base text-gray-500"
      >
        © 2024 Onwy Chat. Todos los derechos reservados.
      </motion.div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { FcGoogle } from 'react-icons/fc'

const words = ["INNOVAR", "CRECER", "COLABORAR", "APRENDER", "LIDERAR"]

export default function Component() {
  const [error, setError] = useState('')
  const [currentWord, setCurrentWord] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn('google', { callbackUrl: '/chat' })
      if (result?.error) {
        setError('Hubo un problema al iniciar sesión con Google. Por favor, intente nuevamente.')
      }
    } catch (error) {
      console.error('Error during Google sign-in:', error)
      setError('Ocurrió un error inesperado. Por favor, intente nuevamente más tarde.')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <h1 className="text-4xl font-bold mb-8 text-center">
          Listo para{' '}
          <AnimatePresence mode="wait">
            <motion.span
              key={currentWord}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="inline-block bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text"
            >
              {words[currentWord]}
            </motion.span>
          </AnimatePresence>
        </h1>

        <div className="bg-gray-900 rounded-lg shadow-lg p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500 text-white rounded-md"
            >
              {error}
            </motion.div>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-gray-800 hover:bg-gray-100 flex items-center justify-center"
            >
              <FcGoogle className="mr-2" size={20} />
              Iniciar Sesión con Google
            </Button>
          </motion.div>
          <p className="mt-6 text-center text-gray-400">
            ¿No tienes una cuenta?{' '}
            <a href="/auth/register" className="text-purple-400 hover:underline">
              Regístrate
            </a>
          </p>
        </div>
      </motion.div>

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

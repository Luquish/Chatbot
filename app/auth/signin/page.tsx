'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { FcGoogle } from 'react-icons/fc'

const words = ["INNOVAR", "CRECER", "COLABORAR", "APRENDER", "LIDERAR"]

function GlowingSphere({ className = "" }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <motion.div
        className="relative w-[400px] h-[400px]"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 30, -30, 0],
          y: [0, -30, 30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 rounded-full blur-[60px] opacity-40"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 30, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-tl from-green-300 via-emerald-400 to-teal-500 rounded-full blur-[60px] opacity-40 mix-blend-screen"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -30, 30, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  )
}

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
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 overflow-hidden">
      <GlowingSphere className="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-center leading-tight">
          Listo para
        </h1>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 text-center"
          >
            <span className="inline-block bg-gradient-to-r from-green-400 via-emerald-300 to-teal-500 text-transparent bg-clip-text">
              {words[currentWord]}
            </span>
          </motion.div>
        </AnimatePresence>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-lg shadow-lg p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500 text-white rounded-md"
            >
              {error}
            </motion.div>
          )}
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="relative z-10"
          >
            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-gray-800 hover:bg-gray-100 transition-all duration-300 flex items-center justify-center py-6"
            >
              <FcGoogle className="mr-2" size={24} />
              Iniciar Sesión con Google
            </Button>
          </motion.div>
          <p className="mt-6 text-center text-gray-300">
            ¿No tienes una cuenta?{' '}
            <a href="/auth/register" className="text-green-400 hover:underline">
              Regístrate
            </a>
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-8 text-base text-gray-500 z-10"
      >
        © 2024 Onwy Chat. Todos los derechos reservados.
      </motion.div>
    </div>
  )
}
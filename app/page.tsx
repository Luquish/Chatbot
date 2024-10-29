// app/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'

const words = ["VIVIR", "DESCUBRIR", "POTENCIAR", "DISFRUTAR", "PENSAR"]

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

export default function LandingPage() {
  const [currentWord, setCurrentWord] = useState(0)
  const [hoverButton, setHoverButton] = useState<boolean>(false)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleSignIn = () => {
    router.push('/auth/signin')
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 overflow-hidden">
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12 relative z-10"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 leading-tight flex flex-col items-center">
          <span>Una nueva forma de</span>
          <div className="relative">
            <GlowingSphere className="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            <AnimatePresence mode="wait">
              <motion.span
                key={currentWord}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-5xl sm:text-6xl md:text-7xl my-6 bg-gradient-to-r from-green-400 via-emerald-300 to-teal-500 text-transparent bg-clip-text relative z-10"
              >
                {words[currentWord]}
              </motion.span>
            </AnimatePresence>
          </div>
          <span>la cultura de tu empresa</span>
        </h1>
        <p className="text-xl md:text-2xl mb-12 text-gray-300">
          IA aplicada para acompañar y potenciar una cultura de innovación y crecimiento en tus equipos.
        </p>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10"
      >
        <Button
          variant="outline"
          size="lg"
          className="bg-gray-900 border-2 border-transparent bg-gradient-to-r from-green-400 to-teal-500 bg-clip-border text-white hover:from-green-500 hover:to-teal-600 transition-all duration-300 text-lg sm:text-xl py-4 sm:py-6 px-6 sm:px-8"
          onMouseEnter={() => setHoverButton(true)}
          onMouseLeave={() => setHoverButton(false)}
          onClick={handleSignIn}
        >
          Comenzar
        </Button>
      </motion.div>

      <div className="h-20 mt-8 relative z-10">
        <AnimatePresence mode="wait">
          {hoverButton && (
            <motion.div
              key="hoverMessage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-gray-400 text-lg sm:text-xl"
            >
              <p>¡Bienvenido a Onwy Chat! Haz clic para comenzar tu experiencia.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
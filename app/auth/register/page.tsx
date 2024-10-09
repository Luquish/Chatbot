'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const router = useRouter()
  
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
          })
    
          if (response.ok) {
            const data = await response.json()
            console.log('Registration successful:', data)
    
            const res = await signIn('credentials', {
              redirect: false,
              email,
              password,
              name,
            })
    
            if (res?.ok) {
              console.log('Sign in successful')
              router.push('/chat')
            } else {
              console.error('Sign in failed:', res?.error)
            }
          } else {
            const errorData = await response.json()
            console.error('Registration failed:', errorData.error)
          }
        } catch (error) {
          console.error('An error occurred:', error)
        }
    }

  return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <form onSubmit={handleRegister} className="w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-center">Registrarse</h2>
            <input
            type="text"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 mb-4 bg-gray-800 rounded"
            />
            <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 mb-4 bg-gray-800 rounded"
            />
            <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 mb-6 bg-gray-800 rounded"
            />
            <Button type="submit" className="w-full">
            Crear Cuenta
            </Button>
        </form>
        </div>
    )
}


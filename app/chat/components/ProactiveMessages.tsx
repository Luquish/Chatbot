// components/ui/ProactiveMessages.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const INACTIVITY_TIMEOUT = 40 * 60 * 1000; // 40 minutos (2400000 ms)

export function ProactiveMessages({ onSendProactiveMessage }: { onSendProactiveMessage: (message: string) => void }) {
  const { data: session } = useSession();
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  const handleActivity = useCallback(() => {
    console.log('Activity detected, resetting timer');
    setLastActivityTime(Date.now());
  }, []);

  useEffect(() => {
    console.log('ProactiveMessages component mounted');

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    const checkInactivity = setInterval(() => {
        const inactiveTime = Date.now() - lastActivityTime;
    
        if (inactiveTime > INACTIVITY_TIMEOUT) {
          const proactivePrompts = [
            "ofrecimiento de ayuda",
            "recordatorio de tareas pendientes",
            "sugerencia de actividad productiva",
            "consultar que estoy haciendo",
            "consultar que hare hoy",
            "consultar que hice hoy",
            "consultar que hare mañana",
            "consultar que hare el fin de semana",
          ];
          const randomPrompt = proactivePrompts[Math.floor(Math.random() * proactivePrompts.length)];
          onSendProactiveMessage(randomPrompt);
          setLastActivityTime(Date.now()); // Reiniciar el temporizador
        }
      }, 1000);

    return () => {
      window.removeEventListener('keypress', handleActivity);
      clearInterval(checkInactivity);
    };
  }, [lastActivityTime, onSendProactiveMessage, handleActivity]);

  return null;
}

export default ProactiveMessages;



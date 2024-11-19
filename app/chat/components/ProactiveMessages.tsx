// components/ui/ProactiveMessages.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const INACTIVITY_SEQUENCE = [1, 5, 15, 15, 30].map(minutes => minutes * 60 * 1000);

export function ProactiveMessages({ onSendProactiveMessage }: { onSendProactiveMessage: (message: string) => void }) {
  const { data: session } = useSession();
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [sequenceIndex, setSequenceIndex] = useState(0);

  const handleActivity = useCallback(() => {
    console.log('Activity detected, resetting timer');
    setLastActivityTime(Date.now());
    setSequenceIndex(0); // Reiniciar la secuencia cuando hay actividad
  }, []);

  useEffect(() => {
    console.log('ProactiveMessages component mounted');

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    const checkInactivity = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityTime;
      
      if (sequenceIndex < INACTIVITY_SEQUENCE.length && 
          inactiveTime > INACTIVITY_SEQUENCE[sequenceIndex]) {
        const proactivePrompts = [
          "ofrecimiento de ayuda",
          "ofrecimiento de ayuda para prepararse para una reunion proxima (usar getEvent y elegir el proximo evento (dentro de la primera semana a partir de hoy))",
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
        setLastActivityTime(Date.now());
        setSequenceIndex(prevIndex => prevIndex + 1); // Avanzar al siguiente tiempo en la secuencia
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      clearInterval(checkInactivity);
    };
  }, [lastActivityTime, onSendProactiveMessage, handleActivity, sequenceIndex]);

  return null;
}

export default ProactiveMessages;



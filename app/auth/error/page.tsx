'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div>
      <h1>Error de Autenticación</h1>
      {error === 'OAuthAccountNotLinked' && (
        <p>
          Parece que ya tienes una cuenta con este correo electrónico usando un método de inicio de sesión diferente. 
          Por favor, inicia sesión con el método que usaste originalmente.
        </p>
      )}
      {/* Manejar otros tipos de errores aquí */}
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}

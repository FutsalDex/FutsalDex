"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function EjercicioDetalleRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main exercises page
    router.replace('/ejercicios');
  }, [router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-medium">Redirigiendo a la biblioteca de ejercicios...</p>
    </div>
  );
}
